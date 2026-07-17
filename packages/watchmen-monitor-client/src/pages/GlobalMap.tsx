import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Filter,
  ChevronDown,
  Loader,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiTile } from '@/components/monitor/KpiTile';
import { StatusPill } from '@/components/monitor/StatusPill';
import { MonoText, EmptyState, ErrorBanner } from '@/components/monitor/common';
import {
  useIngestEvents,
  useAllPipelines,
  usePipelineLogs,
  useAllTopics,
} from '@/hooks/useMonitorQueries';
import {
  getIngestStatusMeta,
  getEventTypeLabel,
  getPipelineLogStatusMeta,
  formatDuration,
  TONE_DOT_CLASS,
  type Tone,
} from '@/utils/monitorConstants';
import { IngestStatus, type EventTriggerItem } from '@/models/monitor.models';
import {
  MonitorLogStatus,
  type PipelineMonitorLogCriteria,
  type PipelineMonitorLog,
} from '@/models/pipeline.models';
import { TopicType, type Topic } from '@/models/topic.models';
import { formatDistanceToNow } from 'date-fns';

type StageId = 'sources' | 'ingestion' | 'topics' | 'pipeline';

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
    <span className="text-[10px] font-semibold tabular-nums text-foreground">{value}</span>
    <div className="flex h-12 w-full max-w-[90px] flex-col-reverse overflow-hidden rounded-md border border-slate-200">
      {segments.map((seg, i) => (
        <div key={i} className={cn(TONE_DOT_CLASS[seg.tone])} style={{ flex: seg.flex }} />
      ))}
    </div>
    <span className="whitespace-nowrap text-[10px] text-muted-foreground">{label}</span>
  </div>
);

/* ── Event detail row (v2 enriched) ──────────────────────────────── */
const EventRow: React.FC<{
  event: EventTriggerItem;
  selected: boolean;
  onClick: () => void;
}> = ({ event, selected, onClick }) => {
  const meta = getIngestStatusMeta(event.status);
  const isExecuting = event.status === IngestStatus.EXECUTING;
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
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${event.percent ?? 50}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">{event.percent ?? 50}%</span>
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

/* ── Filter chip ──────────────────────────────────────────────────── */
const FilterChip: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
}> = ({ children, active, icon }) => (
  <span
    className={cn(
      'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium',
      active
        ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
        : 'border-slate-200 bg-slate-50 text-muted-foreground',
    )}
  >
    {icon}
    {children}
  </span>
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
          <span className="font-semibold text-green-600">{finished}</span> finished · {unfinished} unfinished
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/* ── Main GlobalMap v2 page ───────────────────────────────────────── */
const GlobalMap: React.FC = () => {
  const { t } = useTranslation(['globalMap', 'common', 'nav']);
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = React.useState<StageId>('ingestion');
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);

  // Fetch summary data from all three services
  const eventsQ = useIngestEvents({ pageNumber: 1, pageSize: 8 });
  const topicsQ = useAllTopics();
  const pipelinesQ = useAllPipelines();
  const pipelineLogsQ = usePipelineLogs({
    pageNumber: 1,
    pageSize: 8,
    status: MonitorLogStatus.ERROR,
  } as PipelineMonitorLogCriteria);

  // Compute KPI values from real data
  const events = eventsQ.data?.data ?? [];
  const topics = topicsQ.data ?? [];
  const pipelineLogs = pipelineLogsQ.data?.data ?? [];
  const eventCount = eventsQ.data?.itemCount ?? events.length;
  const topicCount = topics.length;
  const pipelineCount = pipelinesQ.data?.length ?? 0;
  const errorLogCount = pipelineLogsQ.data?.itemCount ?? 0;

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

  // Total factors across topics
  const totalFactors = React.useMemo(
    () => topics.reduce((sum, t) => sum + (t.factors?.length ?? 0), 0),
    [topics],
  );

  // Pipeline action totals
  const pipelineActionTotals = React.useMemo(() => {
    let inserts = 0;
    let updates = 0;
    let deletes = 0;
    for (const log of pipelineLogs) {
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
  }, [pipelineLogs]);

  // Pipeline ID → name lookup map (resolves pipelineId to human-readable name)
  const pipelineNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of pipelinesQ.data ?? []) {
      if (p.pipelineId && p.name) map[p.pipelineId] = p.name;
    }
    return map;
  }, [pipelinesQ.data]);

  const isLoading = eventsQ.isLoading || topicsQ.isLoading;
  const firstExecutingEvent = events.find((e) => e.status === IngestStatus.EXECUTING);

  return (
    <div className="space-y-5">
      {/* Scenario context bar */}
      <div className="flex items-center gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-2.5">
        <HeartPulse className="h-4 w-4 shrink-0 text-indigo-500" />
        <span className="text-xs text-indigo-700">
          <span className="font-semibold">Platform Admin View</span>
          {' · '}
          Deep data flow inspection across sources, ingestion, topics, and pipelines with real-time drill-down
        </span>
      </div>

      {/* Enriched KPI Row (6 tiles) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          label="Flow Health"
          value={errorLogCount > 0 ? `${100 - Math.min(errorLogCount, 100)}` : '100'}
          caption={errorLogCount > 0 ? `${errorLogCount} anomalies` : 'All healthy'}
          tone={errorLogCount > 0 ? 'error' : 'success'}
        />
        <KpiTile
          label="Data Sources"
          value="12"
          caption="10 connected · 2 idle"
          tone="success"
        />
        <KpiTile
          label="Ingestion Events"
          value={eventCount}
          caption={`${statusCounts.success} ok · ${statusCounts.executing} run · ${statusCounts.failed} fail`}
          tone={statusCounts.failed > 0 ? 'warning' : 'success'}
        />
        <KpiTile
          label="Topics"
          value={topicCount}
          caption={`${topicKindCounts['business'] ?? 0} biz · ${topicKindCounts['system'] ?? 0} sys · ${topicKindCounts['synonym'] ?? 0} syn`}
          tone="neutral"
        />
        <KpiTile
          label="Pipeline Runs"
          value={pipelineCount}
          caption={`${pipelineCount - errorLogCount} done · ${errorLogCount} err`}
          tone={errorLogCount > 0 ? 'error' : 'success'}
        />
        <KpiTile
          label="Avg Duration"
          value="2.34"
          caption="sec · across all stages"
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
                  count="12"
                  unit="sources"
                  healthTone="success"
                  healthLabel="10 connected"
                  active={activeStage === 'sources'}
                  onClick={() => setActiveStage('sources')}
                >
                  <div className="mb-2 flex flex-wrap gap-1">
                    <ConnPill>MySQL ×5</ConnPill>
                    <ConnPill>PG ×3</ConnPill>
                    <ConnPill>Kafka ×2</ConnPill>
                    <ConnPill>API ×2</ConnPill>
                  </div>
                </StageCard>

                <FlowConnector />

                {/* Stage 2: Ingestion (SELECTED) */}
                <StageCard
                  icon={<ArrowDownToLine className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Ingestion"
                  count={String(eventCount)}
                  unit="events"
                  healthTone={statusCounts.failed > 0 ? 'warning' : 'success'}
                  healthLabel={`${statusCounts.executing} executing · ${statusCounts.failed} failed`}
                  pulse={statusCounts.executing > 0}
                  active={activeStage === 'ingestion'}
                  onClick={() => setActiveStage('ingestion')}
                >
                  <MiniBreakdown>
                    {Object.entries(eventTypeCounts).map(([label, count]) => `${label} ${count}`).join(' · ') || 'No events'}
                  </MiniBreakdown>
                  {eventCount > 0 && (
                    <StackBar
                      segments={[
                        { pct: (statusCounts.success / eventCount) * 100, tone: 'success' as Tone },
                        { pct: (statusCounts.executing / eventCount) * 100, tone: 'info' as Tone },
                        { pct: (statusCounts.failed / eventCount) * 100, tone: 'error' as Tone },
                        { pct: (statusCounts.waiting / eventCount) * 100, tone: 'warning' as Tone },
                      ].filter((s) => s.pct > 0)}
                    />
                  )}
                </StageCard>

                <FlowConnector delay={0.9} />

                {/* Stage 3: Topics */}
                <StageCard
                  icon={<Layers className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Topics"
                  count={String(topicCount)}
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
                    {totalFactors} factors total
                  </div>
                </StageCard>

                <FlowConnector delay={1.8} />

                {/* Stage 4: Pipeline */}
                <StageCard
                  icon={<GitBranch className="h-3.5 w-3.5 text-indigo-600" />}
                  name="Pipeline"
                  count={String(pipelineCount)}
                  unit="runs"
                  healthTone={errorLogCount > 0 ? 'error' : 'success'}
                  healthLabel={errorLogCount > 0 ? `${errorLogCount} errors` : 'healthy'}
                  active={activeStage === 'pipeline'}
                  onClick={() => setActiveStage('pipeline')}
                >
                  {pipelineCount > 0 && (
                    <StackBar
                      segments={[
                        { pct: ((pipelineCount - errorLogCount) / pipelineCount) * 100, tone: 'success' as Tone },
                        { pct: (errorLogCount / pipelineCount) * 100, tone: 'error' as Tone },
                      ].filter((s) => s.pct > 0)}
                    />
                  )}
                  <MiniBreakdown>
                    +{pipelineActionTotals.inserts} ins · ~{pipelineActionTotals.updates} upd · -{pipelineActionTotals.deletes} del
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
                value={12}
                segments={[
                  { flex: 10, tone: 'success' as Tone },
                  { flex: 2, tone: 'warning' as Tone },
                ]}
              />
              <div className="flex items-center text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
              <LineageCol
                label="Events"
                value={eventCount}
                segments={[
                  { flex: statusCounts.success || 1, tone: 'success' as Tone },
                  { flex: statusCounts.executing || 0, tone: 'info' as Tone },
                  { flex: statusCounts.failed || 0, tone: 'error' as Tone },
                  { flex: statusCounts.waiting || 0, tone: 'warning' as Tone },
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
                value={pipelineCount}
                segments={[
                  { flex: pipelineCount - errorLogCount || 1, tone: 'success' as Tone },
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

        {/* Right column — tabbed detail panel + progress summary */}
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
                      {eventCount} events
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

                {/* Filter chips */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5">
                  <FilterChip active icon={<Filter className="h-3 w-3" />}>
                    Type: All
                  </FilterChip>
                  <FilterChip>
                    Status: All
                    <ChevronDown className="h-3 w-3" />
                  </FilterChip>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {events.length} of {eventCount} shown
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
                ) : events.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No ingestion events" />
                  </div>
                ) : (
                  <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                    {events.map((event) => (
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
                        {errorLogCount} errors
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
                {pipelineLogsQ.error ? (
                  <div className="p-4">
                    <ErrorBanner message={String(pipelineLogsQ.error)} onRetry={() => pipelineLogsQ.refetch()} />
                  </div>
                ) : pipelineLogsQ.isLoading ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : pipelineLogs.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No pipeline errors" description="All runs completed successfully" />
                  </div>
                ) : (
                  <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                    {pipelineLogs.map((log) => {
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
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground">Topics</h2>
                    <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {topicCount} topics
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
                      12 sources
                    </span>
                  </div>
                </div>
                <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-3">
                  {[
                    { name: 'order_db', type: 'MySQL', connected: true, topics: 8 },
                    { name: 'analytics_dw', type: 'PostgreSQL', connected: true, topics: 12 },
                    { name: 'events_stream', type: 'Kafka', connected: true, topics: 5 },
                    { name: 'user_profiles', type: 'MySQL', connected: true, topics: 6 },
                    { name: 'payment_service', type: 'API', connected: false, topics: 3 },
                    { name: 'inventory_db', type: 'PostgreSQL', connected: true, topics: 7 },
                  ].map((src) => (
                    <div
                      key={src.name}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 hover:bg-slate-50"
                    >
                      <Database className={cn('h-3.5 w-3.5 shrink-0', src.type === 'MySQL' ? 'text-blue-500' : src.type === 'PostgreSQL' ? 'text-indigo-500' : src.type === 'Kafka' ? 'text-orange-500' : 'text-cyan-500')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-muted-foreground">{src.type}</span>
                          <MonoText className="truncate text-xs font-semibold text-foreground">: {src.name}</MonoText>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{src.topics} topics</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', src.connected ? 'bg-green-500' : 'bg-orange-400')} />
                        <span className="text-[10px] text-muted-foreground">
                          {src.connected ? 'Connected' : 'Idle'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Progress Summary Mini Card (only when ingestion tab active) */}
          {activeStage === 'ingestion' && !eventsQ.isLoading && events.length > 0 && (
            <Card className="p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Progress Summary</h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader className="h-3 w-3" />
                  {statusCounts.executing} executing
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <ProgressMeter
                  label="Records"
                  finished={events.filter((e) => e.isFinished).length}
                  unfinished={events.filter((e) => !e.isFinished).length}
                />
                <ProgressMeter
                  label="JSON"
                  finished={events.filter((e) => e.isFinished).length}
                  unfinished={events.filter((e) => !e.isFinished).length}
                />
                <ProgressMeter
                  label="Tasks"
                  finished={events.filter((e) => e.isFinished).length}
                  unfinished={events.filter((e) => !e.isFinished).length}
                />
              </div>
            </Card>
          )}

          {/* Execution Stats (only when pipeline tab active) */}
          {activeStage === 'pipeline' && !pipelineLogsQ.isLoading && pipelineLogs.length > 0 && (
            <Card className="p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Execution Stats</h3>
              </div>
              {/* Stacked bar */}
              <div className="mb-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-green-500" style={{ width: String(((pipelineCount - errorLogCount) / (pipelineCount || 1)) * 100) + '%' }} />
                <div className="h-full bg-red-500" style={{ width: String((errorLogCount / (pipelineCount || 1)) * 100) + '%' }} />
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
                  <span className="text-green-600">+{pipelineActionTotals.inserts}</span>
                  <span className="text-blue-600">~{pipelineActionTotals.updates}</span>
                  <span className="text-red-600">-{pipelineActionTotals.deletes}</span>
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
