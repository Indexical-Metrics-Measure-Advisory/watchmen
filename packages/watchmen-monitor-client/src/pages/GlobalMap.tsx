import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Database,
  ArrowDownToLine,
  Layers,
  GitBranch,
  ChevronRight,
  HeartPulse,
  Activity,
  Clock,
  Loader,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiTile } from '@/components/monitor/KpiTile';
import { MonoText, EmptyState, ErrorBanner } from '@/components/monitor/common';
import {
  useIngestEvents,
  useAllPipelines,
  usePipelineLogs,
  useAllTopics,
  useDataSources,
  useDataSourceHealth,
  useIngestEventDetail,
  useIngestProgress,
  useIngestEventStats,
  usePipelineLogStats,
} from '@/hooks/useMonitorQueries';
import type { MonitorOutletContext } from '@/components/Layout';
import {
  getIngestStatusMeta,
  getEventTypeLabel,
  getPipelineLogStatusMeta,
  formatDuration,
  TONE_DOT_CLASS,
  type Tone,
} from '@/utils/monitorConstants';
import { IngestStatus, type EventTriggerItem, type EventResultRecord } from '@/models/monitor.models';
import {
  MonitorLogStatus,
  type PipelineMonitorLogCriteria,
} from '@/models/pipeline.models';
import { TopicType } from '@/models/topic.models';
import type { DataSourceItem, DataSourceHealthItem } from '@/services/dataSourceService';
import { isCollectorDataSource } from '@/services/dataSourceService';
import { formatDistanceToNow } from 'date-fns';

type StageId = 'sources' | 'ingestion' | 'topics' | 'pipeline';
type StatusFilter = 'all' | 'running' | 'failed' | 'success' | 'queued';

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtNum = (n?: number | null): string => (n ?? 0).toLocaleString();

/** Compute overall json-progress percent from per-table detail rows. */
const calcDetailPercent = (rows: EventResultRecord[]): number | null => {
  let finished = 0;
  let total = 0;
  for (const row of rows) {
    finished += row.jsonFinishedCount ?? 0;
    total += (row.jsonCount ?? 0) + (row.jsonFinishedCount ?? 0);
  }
  return total > 0 ? Math.round((finished / total) * 100) : null;
};

const DS_TYPE_ICON_CLASS: Record<string, string> = {
  MYSQL: 'text-blue-500',
  POSTGRESQL: 'text-indigo-500',
  ORACLE: 'text-red-500',
  MSSQL: 'text-amber-600',
  MONGODB: 'text-green-600',
  KAFKA: 'text-orange-500',
  S3: 'text-cyan-500',
  OSS: 'text-cyan-500',
};

const dsTypeIconClass = (type?: string): string =>
  DS_TYPE_ICON_CLASS[(type ?? '').toUpperCase()] ?? 'text-slate-400';

/* ── Animated flow connector ─────────────────────────────────────── */
const FlowConnector: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <div className="flex items-center px-0.5" aria-hidden>
    <div className="relative h-0 w-6 overflow-visible">
      <div className="absolute top-1/2 h-0 w-full -translate-y-1/2 border-t-2 border-dashed border-slate-300" />
      <span
        className="absolute top-1/2 h-1 w-1 -translate-y-1/2 animate-[flow_2s_ease-in-out_infinite] rounded-full bg-indigo-400"
        style={{ animationDelay: `${delay}s` }}
      />
    </div>
    <ChevronRight className="h-3 w-3 text-slate-300" />
  </div>
);

/* ── Stage card (enriched v2 style) ───────────────────────────────── */
const StageCard: React.FC<{
  icon: React.ReactNode;
  name: string;
  count: string;
  unit: string;
  children?: React.ReactNode;
  healthTone: Tone;
  healthLabel: string;
  pulse?: boolean;
  active: boolean;
  onClick: () => void;
}> = ({ icon, name, count, unit, children, healthTone, healthLabel, pulse, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-1 cursor-pointer flex-col rounded-lg border p-3 text-left transition-all',
      active
        ? 'border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
    )}
  >
    <div className="mb-2.5 flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50">{icon}</span>
      <h3 className="text-xs font-semibold text-foreground">{name}</h3>
    </div>
    <div className="mb-2 flex items-baseline gap-1">
      <span className="text-xl font-bold tabular-nums leading-none text-foreground">{count}</span>
      <span className="text-[10px] text-muted-foreground">{unit}</span>
    </div>
    {children}
    <div className="flex-1" />
    <div className="mt-2 flex items-center gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          TONE_DOT_CLASS[healthTone],
          pulse && 'animate-pulse',
        )}
      />
      <span
        className={cn(
          'whitespace-nowrap text-[10px]',
          healthTone === 'error' ? 'font-semibold text-red-600' : 'text-muted-foreground',
        )}
      >
        {healthLabel}
      </span>
    </div>
  </button>
);

/* ── Stacked status bar ───────────────────────────────────────────── */
const StackBar: React.FC<{ segments: { pct: number; tone: Tone }[] }> = ({ segments }) => (
  <div className="mb-1.5 flex h-1 w-full overflow-hidden rounded-full bg-slate-100">
    {segments.map((seg, i) => (
      <div
        key={i}
        className={cn('h-full', TONE_DOT_CLASS[seg.tone])}
        style={{ width: `${seg.pct}%` }}
      />
    ))}
  </div>
);

/* ── Tiny connection pill ─────────────────────────────────────────── */
const ConnPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex h-4 items-center rounded bg-slate-100 px-1.5 font-mono text-[9px] font-semibold tracking-wide text-slate-600">
    {children}
  </span>
);

/* ── Mini breakdown text ──────────────────────────────────────────── */
const MiniBreakdown: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-1.5 font-mono text-[10px] leading-tight text-muted-foreground">{children}</div>
);

/* ── Lineage column (vertical stacked bar) ────────────────────────── */
const LineageCol: React.FC<{
  label: string;
  value: number;
  segments: { flex: number; tone: Tone }[];
}> = ({ label, value, segments }) => (
  <div className="flex flex-1 flex-col items-center gap-1.5">
    <span className="text-[10px] font-semibold tabular-nums text-foreground">{fmtNum(value)}</span>
    <div className="flex h-12 w-full max-w-[90px] flex-col-reverse overflow-hidden rounded-md border border-slate-200">
      {segments.map((seg, i) => (
        <div key={i} className={cn(TONE_DOT_CLASS[seg.tone])} style={{ flex: seg.flex }} />
      ))}
    </div>
    <span className="whitespace-nowrap text-[10px] text-muted-foreground">{label}</span>
  </div>
);

/* ── Event detail row ────────────────────────────────────────────── */
const EventRow: React.FC<{
  event: EventTriggerItem;
  selected: boolean;
  onClick: () => void;
}> = ({ event, selected, onClick }) => {
  const meta = getIngestStatusMeta(event.status);
  const isExecuting = event.status === IngestStatus.EXECUTING;
  // Real per-event progress, only fetched while the event is executing.
  const detailQ = useIngestEventDetail(isExecuting ? event.eventTriggerId : null);
  const percent = isExecuting ? calcDetailPercent(detailQ.data ?? []) : null;
  const duration = event.startTime
    ? event.endTime
      ? new Date(event.endTime).getTime() - new Date(event.startTime).getTime()
      : Date.now() - new Date(event.startTime).getTime()
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-colors',
        selected
          ? 'border-indigo-200 bg-indigo-50'
          : 'border-transparent hover:bg-slate-50',
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              TONE_DOT_CLASS[meta.tone],
              isExecuting && 'animate-pulse',
            )}
          />
          <span className="inline-flex h-4 shrink-0 items-center rounded bg-slate-100 px-1.5 font-mono text-[9px] font-semibold tracking-wide text-slate-600">
            {getEventTypeLabel(event.type)}
          </span>
          <MonoText className="truncate text-xs font-semibold text-foreground">
            {event.tableName || event.pipelineId || '—'}
          </MonoText>
        </div>
        {isExecuting ? (
          <span className="shrink-0 text-[10px] font-semibold text-blue-600">Running</span>
        ) : meta.tone === 'error' ? (
          <span className="shrink-0 text-[10px] font-semibold text-red-600">Failed</span>
        ) : meta.tone === 'warning' ? (
          <span className="shrink-0 text-[10px] font-semibold text-orange-500">Queued</span>
        ) : (
          event.startTime && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(event.startTime), { addSuffix: true })}
            </span>
          )
        )}
      </div>
      <div className="flex items-center justify-between gap-2 pl-4">
        <MonoText className="truncate text-[10px] text-muted-foreground">
          #{event.eventTriggerId}
        </MonoText>
        {isExecuting ? (
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full bg-blue-500 transition-all', percent == null && 'animate-pulse')}
                style={{ width: `${percent ?? 100}%`, opacity: percent == null ? 0.4 : 1 }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {percent == null ? '…' : `${percent}%`}
            </span>
          </div>
        ) : (
          <span
            className={cn(
              'shrink-0 text-[10px] tabular-nums',
              meta.tone === 'error' ? 'font-semibold text-red-600' : 'text-muted-foreground',
            )}
          >
            {event.startTime ? `${formatDuration(duration)}` : '—'}
            {meta.tone === 'error' && ' FAIL'}
          </span>
        )}
      </div>
    </button>
  );
};

/* ── Compact filter select ────────────────────────────────────────── */
const FilterSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}> = ({ value, onChange, options, ariaLabel }) => (
  <select
    aria-label={ariaLabel}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-5 cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:border-slate-300 focus:border-indigo-300"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

/* ── Progress meter (thin, for summary card) ──────────────────────── */
const ProgressMeter: React.FC<{
  label: string;
  finished: number;
  unfinished: number;
}> = ({ label, finished, unfinished }) => {
  const total = finished + unfinished;
  const pct = total > 0 ? (finished / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-green-600">{fmtNum(finished)}</span> / {fmtNum(total)}
          <span className="ml-1.5 text-indigo-600">{Math.round(pct)}%</span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/* ── Main GlobalMap v2 page ───────────────────────────────────────── */
const GlobalMap: React.FC = () => {
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = React.useState<StageId>('ingestion');
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');

  // Fetch summary data from all services
  const eventsQ = useIngestEvents({ pageNumber: 1, pageSize: 8 });
  const topicsQ = useAllTopics();
  const pipelinesQ = useAllPipelines();
  const dataSourcesQ = useDataSources();
  const pipelineErrorLogsQ = usePipelineLogs({
    pageNumber: 1,
    pageSize: 8,
    status: MonitorLogStatus.ERROR,
  } as PipelineMonitorLogCriteria);
  // Total pipeline runs (itemCount only, single-row page).
  const pipelineAllLogsQ = usePipelineLogs({
    pageNumber: 1,
    pageSize: 1,
  } as PipelineMonitorLogCriteria);
  // Aggregated stats from the new backend endpoints (fall back to page samples when unavailable).
  const dataSourceHealthQ = useDataSourceHealth();
  const pipelineStatsQ = usePipelineLogStats({ sampleSize: 200 });
  const eventStatsQ = useIngestEventStats(200);

  // Refresh cadence is driven globally from the Layout top-bar selector
  // (1m/5m/10m/manual); Layout owns the timer and invalidates all monitor
  // query prefixes. Here we only consume the exposed refresh controls so the
  // in-page "Refresh now" button shares the same channel.
  const { refresh, isRefreshing } = useOutletContext<MonitorOutletContext>();

  // Compute KPI values from real data
  const events = React.useMemo(() => eventsQ.data?.data ?? [], [eventsQ.data]);
  const topics = React.useMemo(() => topicsQ.data ?? [], [topicsQ.data]);
  const pipelineErrorLogs = React.useMemo(() => pipelineErrorLogsQ.data?.data ?? [], [pipelineErrorLogsQ.data]);
  const dataSources = React.useMemo(() => dataSourcesQ.data ?? [], [dataSourcesQ.data]);
  const eventCount = eventsQ.data?.itemCount ?? events.length;
  const topicCount = topics.length;
  const errorLogCount = pipelineErrorLogsQ.data?.itemCount ?? 0;
  const pipelineRunCount = pipelineAllLogsQ.data?.itemCount ?? 0;

  // Status breakdowns from actual events
  const statusCounts = React.useMemo(() => {
    const counts = { success: 0, executing: 0, failed: 0, waiting: 0, initial: 0 };
    for (const e of events) {
      const meta = getIngestStatusMeta(e.status);
      if (meta.tone === 'success') counts.success++;
      else if (meta.tone === 'info') counts.executing++;
      else if (meta.tone === 'error') counts.failed++;
      else if (meta.tone === 'warning') counts.waiting++;
      else counts.initial++;
    }
    return counts;
  }, [events]);

  // Event type breakdown
  const eventTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const label = getEventTypeLabel(e.type);
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  // Topic type breakdown
  const topicTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const topic of topics) {
      const type = topic.type ?? 'raw';
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return counts;
  }, [topics]);

  // Topic kind breakdown
  const topicKindCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const topic of topics) {
      const kind = topic.kind ?? 'business';
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    return counts;
  }, [topics]);

  // Data source type breakdown
  const dsTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ds of dataSources) {
      const type = (ds.dataSourceType ?? 'UNKNOWN').toUpperCase();
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return counts;
  }, [dataSources]);

  // Total factors across topics
  const totalFactors = React.useMemo(
    () => topics.reduce((sum, t) => sum + (t.factors?.length ?? 0), 0),
    [topics],
  );

  // Pipeline action totals (from the error logs currently loaded)
  const pipelineActionTotals = React.useMemo(() => {
    let inserts = 0;
    let updates = 0;
    let deletes = 0;
    for (const log of pipelineErrorLogs) {
      for (const stage of log.stages ?? []) {
        for (const unit of stage.units ?? []) {
          for (const action of unit.actions ?? []) {
            inserts += action.insertCount ?? 0;
            updates += action.updateCount ?? 0;
            deletes += action.deleteCount ?? 0;
          }
        }
      }
    }
    return { inserts, updates, deletes };
  }, [pipelineErrorLogs]);

  // Pipeline ID → name lookup map (resolves pipelineId to human-readable name)
  const pipelineNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of pipelinesQ.data ?? []) {
      if (p.pipelineId && p.name) map[p.pipelineId] = p.name;
    }
    return map;
  }, [pipelinesQ.data]);

  // Average duration of finished events on the current page (honest recent-sample metric)
  const avgDurationMs = React.useMemo(() => {
    const durations = events
      .filter((e) => e.startTime && e.endTime)
      .map((e) => new Date(e.endTime as string).getTime() - new Date(e.startTime as string).getTime());
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [events]);

  // Auto-select the first executing event (or the first event) for the detail card
  React.useEffect(() => {
    if (selectedEventId || events.length === 0) return;
    const executing = events.find((e) => e.status === IngestStatus.EXECUTING);
    setSelectedEventId((executing ?? events[0]).eventTriggerId);
  }, [events, selectedEventId]);

  // Client-side filtering of the loaded events
  const filteredEvents = React.useMemo(
    () =>
      events.filter((e) => {
        if (typeFilter !== 'all' && getEventTypeLabel(e.type) !== typeFilter) return false;
        if (statusFilter === 'all') return true;
        const tone = getIngestStatusMeta(e.status).tone;
        if (statusFilter === 'running') return tone === 'info';
        if (statusFilter === 'failed') return tone === 'error';
        if (statusFilter === 'success') return tone === 'success';
        return tone === 'warning'; // queued
      }),
    [events, typeFilter, statusFilter],
  );

  // Selected event drill-down queries (real per-event progress data)
  const drillDownEnabled = activeStage === 'ingestion' && selectedEventId != null;
  const eventDetailQ = useIngestEventDetail(selectedEventId, drillDownEnabled);
  const recordCountsQ = useIngestProgress(selectedEventId, 'record', drillDownEnabled);
  const jsonCountsQ = useIngestProgress(selectedEventId, 'json', drillDownEnabled);
  const taskCountsQ = useIngestProgress(selectedEventId, 'task', drillDownEnabled);
  const selectedEvent = events.find((e) => e.eventTriggerId === selectedEventId) ?? null;
  const eventDetailRows = eventDetailQ.data ?? [];

  // Data source health probe results (dataSourceId → probe item)
  const dsHealthMap = React.useMemo(() => {
    const map: Record<string, DataSourceHealthItem> = {};
    for (const item of dataSourceHealthQ.data?.sources ?? []) {
      map[item.dataSourceId] = item;
    }
    return map;
  }, [dataSourceHealthQ.data]);
  const dsHealthCounts = React.useMemo(() => {
    let ok = 0;
    let failed = 0;
    for (const item of dataSourceHealthQ.data?.sources ?? []) {
      if (item.status === 'ok') ok++;
      else if (item.status === 'error' || item.status === 'timeout') failed++;
    }
    return { ok, failed, checked: (dataSourceHealthQ.data?.sources ?? []).length > 0 };
  }, [dataSourceHealthQ.data]);

  // Global ingestion status counts (exact, from /ingest/monitor/event/stats; falls back to page sample)
  const globalStatusCounts = React.useMemo(() => {
    const byStatus = eventStatsQ.data?.byStatus;
    if (!byStatus) return null;
    return {
      success: byStatus[String(IngestStatus.SUCCESS)] ?? 0,
      executing: byStatus[String(IngestStatus.EXECUTING)] ?? 0,
      failed: byStatus[String(IngestStatus.FAIL)] ?? 0,
      waiting: byStatus[String(IngestStatus.WAITING)] ?? 0,
      initial: byStatus[String(IngestStatus.INITIAL)] ?? 0,
    };
  }, [eventStatsQ.data]);
  const effStatusCounts = globalStatusCounts ?? statusCounts;

  // Global pipeline write totals (from /pipeline/log/stats sample; falls back to loaded error logs)
  const effPipelineActionTotals = React.useMemo(() => {
    const stats = pipelineStatsQ.data;
    if (!stats) return pipelineActionTotals;
    return { inserts: stats.insertCount, updates: stats.updateCount, deletes: stats.deleteCount };
  }, [pipelineStatsQ.data, pipelineActionTotals]);

  const isLoading = eventsQ.isLoading || topicsQ.isLoading || dataSourcesQ.isLoading;
  const healthPct =
    pipelineRunCount > 0 ? Math.round(((pipelineRunCount - errorLogCount) / pipelineRunCount) * 100) : 100;
  // Avg duration: prefer pipeline-run stats (server-side sample), fall back to finished events on this page.
  const effAvgDurationMs = pipelineStatsQ.data?.avgDurationMs ?? avgDurationMs;
  const avgDurationCaption = pipelineStatsQ.data?.avgDurationMs != null ? 'pipeline runs avg' : 'recent events';

  return (
    <div className="space-y-5">
      {/* Scenario context bar + live refresh indicator */}
      <div className="flex items-center gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-2.5">
        <HeartPulse className="h-4 w-4 shrink-0 text-indigo-500" />
        <span className="text-xs text-indigo-700">
          <span className="font-semibold">Platform Admin View</span>
          {' · '}
          Deep data flow inspection across sources, ingestion, topics, and pipelines with real-time drill-down
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-[10px] font-semibold text-green-600">LIVE</span>
          {eventsQ.dataUpdatedAt > 0 && (
            <span className="hidden text-[10px] text-indigo-400 sm:inline">
              {formatDistanceToNow(eventsQ.dataUpdatedAt, { addSuffix: true })}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh now"
            className="inline-flex h-5 w-5 items-center justify-center rounded text-indigo-500 transition-colors hover:bg-indigo-100"
          >
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Enriched KPI Row (6 tiles) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          label="Flow Health"
          value={`${healthPct}%`}
          caption={errorLogCount > 0 ? `${fmtNum(errorLogCount)} anomalies` : 'All healthy'}
          tone={errorLogCount > 0 ? 'error' : 'success'}
        />
        <KpiTile
          label="Data Sources"
          value={dataSourcesQ.isLoading ? '…' : fmtNum(dataSources.length)}
          caption={
            dsHealthCounts.checked
              ? `${dsHealthCounts.ok} connected · ${dsHealthCounts.failed} failed`
              : Object.entries(dsTypeCounts)
                  .slice(0, 2)
                  .map(([type, count]) => `${type.toLowerCase()} ×${count}`)
                  .join(' · ') || 'Registered sources'
          }
          tone={dsHealthCounts.failed > 0 ? 'error' : 'neutral'}
        />
        <KpiTile
          label="Ingestion Events"
          value={fmtNum(eventCount)}
          caption={`${effStatusCounts.success} ok · ${effStatusCounts.executing} run · ${effStatusCounts.failed} fail`}
          tone={effStatusCounts.failed > 0 ? 'warning' : 'success'}
        />
        <KpiTile
          label="Topics"
          value={fmtNum(topicCount)}
          caption={`${topicKindCounts['business'] ?? 0} biz · ${topicKindCounts['system'] ?? 0} sys · ${topicKindCounts['synonym'] ?? 0} syn`}
          tone="neutral"
        />
        <KpiTile
          label="Pipeline Runs"
          value={fmtNum(pipelineRunCount)}
          caption={`${fmtNum(pipelineRunCount - errorLogCount)} done · ${fmtNum(errorLogCount)} err`}
          tone={errorLogCount > 0 ? 'error' : 'success'}
        />
        <KpiTile
          label="Avg Duration"
          value={effAvgDurationMs != null ? formatDuration(effAvgDurationMs) : '—'}
          caption={avgDurationCaption}
          tone="info"
        />
      </div>

      {/* Main: flow diagram + tabbed detail panel */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Enriched Flow Diagram */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Data Flow</h2>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Sources → Ingestion → Topics → Pipeline
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 flex-1" />
                ))}
              </div>
            ) : (
              <div className="flex items-stretch gap-1">
                {/* Stage 1: Sources */}
                <StageCard
                  icon={<Database className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Sources"
                  count={fmtNum(dataSources.length)}
                  unit="sources"
                  healthTone={!dsHealthCounts.checked ? 'neutral' : dsHealthCounts.failed > 0 ? 'error' : 'success'}
                  healthLabel={
                    dsHealthCounts.checked
                      ? `${dsHealthCounts.ok} connected · ${dsHealthCounts.failed} failed`
                      : `${fmtNum(dataSources.length)} registered`
                  }
                  active={activeStage === 'sources'}
                  onClick={() => setActiveStage('sources')}
                >
                  <div className="mb-2 flex flex-wrap gap-1">
                    {Object.entries(dsTypeCounts)
                      .slice(0, 4)
                      .map(([type, count]) => (
                        <ConnPill key={type}>
                          {type} ×{count}
                        </ConnPill>
                      ))}
                    {Object.keys(dsTypeCounts).length === 0 && <ConnPill>none</ConnPill>}
                  </div>
                </StageCard>

                <FlowConnector />

                {/* Stage 2: Ingestion */}
                <StageCard
                  icon={<ArrowDownToLine className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Ingestion"
                  count={fmtNum(eventCount)}
                  unit="events"
                  healthTone={effStatusCounts.failed > 0 ? 'warning' : 'success'}
                  healthLabel={`${effStatusCounts.executing} executing · ${effStatusCounts.failed} failed`}
                  pulse={effStatusCounts.executing > 0}
                  active={activeStage === 'ingestion'}
                  onClick={() => setActiveStage('ingestion')}
                >
                  <MiniBreakdown>
                    {Object.entries(eventTypeCounts).map(([label, count]) => `${label} ${count}`).join(' · ') || 'No events'}
                  </MiniBreakdown>
                  {eventCount > 0 && (
                    <StackBar
                      segments={[
                        { pct: (effStatusCounts.success / eventCount) * 100, tone: 'success' as Tone },
                        { pct: (effStatusCounts.executing / eventCount) * 100, tone: 'info' as Tone },
                        { pct: (effStatusCounts.failed / eventCount) * 100, tone: 'error' as Tone },
                        { pct: (effStatusCounts.waiting / eventCount) * 100, tone: 'warning' as Tone },
                      ].filter((s) => s.pct > 0)}
                    />
                  )}
                </StageCard>

                <FlowConnector delay={0.9} />

                {/* Stage 3: Topics */}
                <StageCard
                  icon={<Layers className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Topics"
                  count={fmtNum(topicCount)}
                  unit="topics"
                  healthTone="success"
                  healthLabel="healthy"
                  active={activeStage === 'topics'}
                  onClick={() => setActiveStage('topics')}
                >
                  <MiniBreakdown>
                    RAW {topicTypeCounts[TopicType.RAW] ?? 0} · DISTINCT {topicTypeCounts[TopicType.DISTINCT] ?? 0} · AGG {topicTypeCounts[TopicType.AGGREGATE] ?? 0} · META {topicTypeCounts[TopicType.META] ?? 0}
                  </MiniBreakdown>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    <ConnPill>BIZ {topicKindCounts['business'] ?? 0}</ConnPill>
                    <ConnPill>SYS {topicKindCounts['system'] ?? 0}</ConnPill>
                    <ConnPill>SYN {topicKindCounts['synonym'] ?? 0}</ConnPill>
                  </div>
                  <div className="mb-1 font-mono text-[10px] text-muted-foreground">
                    {fmtNum(totalFactors)} factors total
                  </div>
                </StageCard>

                <FlowConnector delay={1.8} />

                {/* Stage 4: Pipeline */}
                <StageCard
                  icon={<GitBranch className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Pipeline"
                  count={fmtNum(pipelineRunCount)}
                  unit="runs"
                  healthTone={errorLogCount > 0 ? 'error' : 'success'}
                  healthLabel={errorLogCount > 0 ? `${fmtNum(errorLogCount)} errors` : 'healthy'}
                  active={activeStage === 'pipeline'}
                  onClick={() => setActiveStage('pipeline')}
                >
                  {pipelineRunCount > 0 && (
                    <StackBar
                      segments={[
                        { pct: ((pipelineRunCount - errorLogCount) / pipelineRunCount) * 100, tone: 'success' as Tone },
                        { pct: (errorLogCount / pipelineRunCount) * 100, tone: 'error' as Tone },
                      ].filter((s) => s.pct > 0)}
                    />
                  )}
                  <MiniBreakdown>
                    +{fmtNum(effPipelineActionTotals.inserts)} ins · ~{fmtNum(effPipelineActionTotals.updates)} upd · -{fmtNum(effPipelineActionTotals.deletes)} del
                  </MiniBreakdown>
                </StageCard>
              </div>
            )}
          </Card>

          {/* Cross-Stage Data Lineage */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Cross-Stage Lineage</h2>
              <span className="text-xs text-muted-foreground">Volume by health</span>
            </div>
            <div className="flex items-end gap-1">
              <LineageCol
                label="Sources"
                value={dataSources.length}
                segments={[{ flex: dataSources.length || 1, tone: 'success' as Tone }]}
              />
              <div className="flex items-center text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
              <LineageCol
                label="Events"
                value={eventCount}
                segments={[
                  { flex: effStatusCounts.success || 1, tone: 'success' as Tone },
                  { flex: effStatusCounts.executing || 0, tone: 'info' as Tone },
                  { flex: effStatusCounts.failed || 0, tone: 'error' as Tone },
                  { flex: effStatusCounts.waiting || 0, tone: 'warning' as Tone },
                ].filter((s) => s.flex > 0)}
              />
              <div className="flex items-center text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
              <LineageCol
                label="Topics"
                value={topicCount}
                segments={[{ flex: topicCount || 1, tone: 'success' as Tone }]}
              />
              <div className="flex items-center text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
              <LineageCol
                label="Runs"
                value={pipelineRunCount}
                segments={[
                  { flex: pipelineRunCount - errorLogCount || 1, tone: 'success' as Tone },
                  { flex: errorLogCount || 0, tone: 'error' as Tone },
                ].filter((s) => s.flex > 0)}
              />
            </div>
            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
              {[
                { tone: 'success' as Tone, label: 'Success / Connected' },
                { tone: 'info' as Tone, label: 'Executing' },
                { tone: 'warning' as Tone, label: 'Idle / Waiting / Ignored' },
                { tone: 'error' as Tone, label: 'Error / Failed' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT_CLASS[item.tone])} />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column — tabbed detail panel + drill-down cards */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex min-w-0 flex-col p-0">
            {/* Tab bar */}
            <div className="flex items-center border-b border-slate-100 px-2">
              {([
                { id: 'sources' as const, label: 'Sources' },
                { id: 'ingestion' as const, label: 'Ingestion' },
                { id: 'topics' as const, label: 'Topics' },
                { id: 'pipeline' as const, label: 'Pipeline' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStage(tab.id)}
                  className={cn(
                    'flex-1 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors',
                    activeStage === tab.id
                      ? 'border-indigo-500 font-semibold text-indigo-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeStage === 'ingestion' && (
              <div className="flex min-w-0 flex-col">
                {/* Panel header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground">Ingestion Events</h2>
                    <span className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                      {fmtNum(eventCount)} events
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/ingestion')}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View All
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5">
                  <FilterSelect
                    ariaLabel="Filter by type"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={[
                      { value: 'all', label: 'Type: All' },
                      ...Object.keys(eventTypeCounts).map((label) => ({ value: label, label })),
                    ]}
                  />
                  <FilterSelect
                    ariaLabel="Filter by status"
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    options={[
                      { value: 'all', label: 'Status: All' },
                      { value: 'running', label: 'Running' },
                      { value: 'failed', label: 'Failed' },
                      { value: 'success', label: 'Success' },
                      { value: 'queued', label: 'Queued' },
                    ]}
                  />
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {filteredEvents.length} of {fmtNum(eventCount)} shown
                  </span>
                </div>

                {/* Event list */}
                {eventsQ.error ? (
                  <div className="p-4">
                    <ErrorBanner message={String(eventsQ.error)} onRetry={() => eventsQ.refetch()} />
                  </div>
                ) : eventsQ.isLoading ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No ingestion events" />
                  </div>
                ) : (
                  <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                    {filteredEvents.map((event) => (
                      <EventRow
                        key={event.eventTriggerId}
                        event={event}
                        selected={selectedEventId === event.eventTriggerId}
                        onClick={() => setSelectedEventId(event.eventTriggerId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeStage === 'pipeline' && (
              <div className="flex min-w-0 flex-col">
                {/* Panel header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground">Pipeline Logs</h2>
                    {errorLogCount > 0 && (
                      <span className="inline-flex shrink-0 items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                        {fmtNum(errorLogCount)} errors
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/pipeline')}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View All
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Pipeline log list */}
                {pipelineErrorLogsQ.error ? (
                  <div className="p-4">
                    <ErrorBanner message={String(pipelineErrorLogsQ.error)} onRetry={() => pipelineErrorLogsQ.refetch()} />
                  </div>
                ) : pipelineErrorLogsQ.isLoading ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : pipelineErrorLogs.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No pipeline errors" description="All runs completed successfully" />
                  </div>
                ) : (
                  <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                    {pipelineErrorLogs.map((log) => {
                      const sm = getPipelineLogStatusMeta(log.status);
                      return (
                        <div
                          key={log.uid}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 hover:bg-slate-50"
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 shrink-0 rounded-full',
                              sm.tone === 'success' ? 'bg-green-500'
                                : sm.tone === 'error' ? 'bg-red-500'
                                : sm.tone === 'warning' ? 'bg-orange-500'
                                : 'bg-slate-400',
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-foreground">
                              {log.pipelineId ? (pipelineNameMap[log.pipelineId] ?? log.pipelineId) : '—'}
                            </span>
                            <MonoText className="text-[10px] text-muted-foreground">
                              {log.traceId ? `${log.traceId.slice(0, 16)}...` : '—'}
                            </MonoText>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <MonoText className="text-[10px] text-muted-foreground">
                              {formatDuration(log.spentInMills)}
                            </MonoText>
                            {log.startTime && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(log.startTime), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeStage === 'topics' && (
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground">Topics</h2>
                    <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {fmtNum(topicCount)} topics
                    </span>
                  </div>
                </div>
                {topicsQ.error ? (
                  <div className="p-4">
                    <ErrorBanner message={String(topicsQ.error)} onRetry={() => topicsQ.refetch()} />
                  </div>
                ) : topicsQ.isLoading ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                    {topics.slice(0, 8).map((topic) => (
                      <div
                        key={topic.topicId}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 hover:bg-slate-50"
                      >
                        <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-4 items-center rounded bg-indigo-50 px-1.5 font-mono text-[9px] font-semibold tracking-wide text-indigo-600">
                              {topic.type ?? 'raw'}
                            </span>
                            <MonoText className="truncate text-xs font-semibold text-foreground">
                              {topic.name ?? topic.topicId}
                            </MonoText>
                          </div>
                          {topic.dataSourceId && (
                            <MonoText className="text-[10px] text-muted-foreground">
                              src: {topic.dataSourceId}
                            </MonoText>
                          )}
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {topic.factors?.length ?? 0} factors
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeStage === 'sources' && (
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground">Data Sources</h2>
                    <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {fmtNum(dataSources.length)} sources
                    </span>
                  </div>
                </div>
                {dataSourcesQ.error ? (
                  <div className="p-4">
                    <ErrorBanner message={String(dataSourcesQ.error)} onRetry={() => dataSourcesQ.refetch()} />
                  </div>
                ) : dataSourcesQ.isLoading ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : dataSources.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No data sources registered" />
                  </div>
                ) : (
                  <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                    {dataSources.map((src: DataSourceItem) => {
                      const health = dsHealthMap[src.dataSourceId];
                      const healthTone: Tone | null =
                        health == null ? null
                        : health.status === 'ok' ? 'success'
                        : health.status === 'error' ? 'error'
                        : health.status === 'timeout' ? 'warning'
                        : 'neutral';
                      const healthTitle =
                        health == null ? undefined
                        : health.status === 'ok'
                          ? `Connected${health.latencyMs != null ? ` · ${health.latencyMs}ms` : ''}`
                          : health.status === 'skipped'
                            ? 'Probe skipped (non-SQL source)'
                            : health.error ?? health.status;
                      return (
                        <div
                          key={src.dataSourceId}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 hover:bg-slate-50"
                        >
                          <Database className={cn('h-3.5 w-3.5 shrink-0', dsTypeIconClass(src.dataSourceType))} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-4 items-center rounded bg-slate-100 px-1.5 font-mono text-[9px] font-semibold tracking-wide text-slate-600">
                                {(src.dataSourceType ?? 'UNKNOWN').toUpperCase()}
                              </span>
                              <MonoText className="truncate text-xs font-semibold text-foreground">
                                {src.name ?? src.dataSourceCode ?? src.dataSourceId}
                              </MonoText>
                              {isCollectorDataSource(src) && (
                                <span
                                  title="Data source flagged as the ingestion collector (param collector=true)"
                                  className="inline-flex h-4 shrink-0 items-center rounded border border-amber-200 bg-amber-50 px-1.5 text-[9px] font-semibold text-amber-700"
                                >
                                  collector
                                </span>
                              )}
                            </div>
                            {src.host && (
                              <MonoText className="text-[10px] text-muted-foreground">
                                {src.host}
                                {src.port ? `:${src.port}` : ''}
                              </MonoText>
                            )}
                          </div>
                          {healthTone != null ? (
                            <span
                              title={healthTitle}
                              className="flex shrink-0 items-center gap-1.5"
                            >
                              {health?.status === 'ok' && health.latencyMs != null && (
                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                  {health.latencyMs}ms
                                </span>
                              )}
                              <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT_CLASS[healthTone])} />
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] text-muted-foreground">Registered</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Event Detail drill-down (only when ingestion tab active and an event is selected) */}
          {activeStage === 'ingestion' && selectedEventId && (
            <Card className="p-5">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Event Detail</h3>
                  <MonoText className="truncate text-[10px] text-muted-foreground">
                    #{selectedEventId}
                    {selectedEvent?.tableName ? ` · ${selectedEvent.tableName}` : ''}
                  </MonoText>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader className="h-3 w-3" />
                  {effStatusCounts.executing} executing
                </span>
              </div>

              {/* Real per-stage progress for the selected event */}
              <div className="mb-4 flex flex-col gap-3">
                {recordCountsQ.isLoading || jsonCountsQ.isLoading || taskCountsQ.isLoading ? (
                  <>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </>
                ) : (
                  <>
                    <ProgressMeter
                      label="Records"
                      finished={recordCountsQ.data?.finished ?? 0}
                      unfinished={recordCountsQ.data?.unfinished ?? 0}
                    />
                    <ProgressMeter
                      label="JSON"
                      finished={jsonCountsQ.data?.finished ?? 0}
                      unfinished={jsonCountsQ.data?.unfinished ?? 0}
                    />
                    <ProgressMeter
                      label="Tasks"
                      finished={taskCountsQ.data?.finished ?? 0}
                      unfinished={taskCountsQ.data?.unfinished ?? 0}
                    />
                  </>
                )}
              </div>

              {/* Per-table breakdown */}
              {eventDetailQ.error ? (
                <ErrorBanner message={String(eventDetailQ.error)} onRetry={() => eventDetailQ.refetch()} />
              ) : eventDetailQ.isLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : eventDetailRows.length === 0 ? (
                <EmptyState title="No table detail for this event" />
              ) : (
                <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
                  {eventDetailRows.map((row) => {
                    const jsonTotal = (row.jsonCount ?? 0) + (row.jsonFinishedCount ?? 0);
                    const jsonPct = jsonTotal > 0 ? ((row.jsonFinishedCount ?? 0) / jsonTotal) * 100 : 0;
                    const rowTone: Tone =
                      (row.errors ?? 0) > 0 ? 'error' : jsonTotal > 0 && jsonPct < 100 ? 'info' : 'success';
                    return (
                      <div
                        key={row.tableTriggerId ?? row.tableName}
                        className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-slate-50"
                      >
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT_CLASS[rowTone])} />
                        <MonoText className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                          {row.tableName ?? '—'}
                        </MonoText>
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {fmtNum(row.dataCount)} rows
                        </span>
                        <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full', TONE_DOT_CLASS[rowTone])}
                            style={{ width: `${jsonPct}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                          {fmtNum(row.jsonFinishedCount)}/{fmtNum(jsonTotal)}
                        </span>
                        {(row.errors ?? 0) > 0 && (
                          <span className="shrink-0 rounded bg-red-50 px-1 text-[9px] font-semibold text-red-600">
                            {row.errors} err
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Execution Stats (only when pipeline tab active) */}
          {activeStage === 'pipeline' && !pipelineErrorLogsQ.isLoading && pipelineRunCount > 0 && (
            <Card className="p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Execution Stats</h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {fmtNum(pipelineRunCount)} runs
                  {pipelineStatsQ.data?.p95DurationMs != null && (
                    <span className="ml-1">· p95 {formatDuration(pipelineStatsQ.data.p95DurationMs)}</span>
                  )}
                </span>
              </div>
              {/* Stacked bar */}
              <div className="mb-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-green-500" style={{ width: String(((pipelineRunCount - errorLogCount) / (pipelineRunCount || 1)) * 100) + '%' }} />
                <div className="h-full bg-red-500" style={{ width: String((errorLogCount / (pipelineRunCount || 1)) * 100) + '%' }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-muted-foreground">Done</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] text-muted-foreground">Errors</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-green-600">+{fmtNum(effPipelineActionTotals.inserts)}</span>
                  <span className="text-blue-600">~{fmtNum(effPipelineActionTotals.updates)}</span>
                  <span className="text-red-600">-{fmtNum(effPipelineActionTotals.deletes)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalMap;
