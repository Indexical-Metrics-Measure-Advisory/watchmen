import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/monitor/StatusPill';
import { ProgressMeter } from '@/components/monitor/ProgressMeter';
import { ProgressGauge } from '@/components/monitor/ProgressGauge';
import { KpiTile } from '@/components/monitor/KpiTile';
import { MonoText, EmptyState, ErrorBanner, PanelHeader } from '@/components/monitor/common';
import {
  useIngestEvents,
  useIngestEventDetail,
  useIngestProgress,
  useIngestEventStats,
  useDataSources,
  useDataSourceHealth,
} from '@/hooks/useMonitorQueries';
import {
  getIngestStatusMeta,
  getEventTypeLabel,
  formatDuration,
  formatPercent,
  TONE_DOT_CLASS,
  type Tone,
} from '@/utils/monitorConstants';
import { IngestStatus } from '@/models/monitor.models';
import { pipelineMetaService } from '@/services/pipelineMetaService';
import { isCollectorDataSource, type DataSourceHealthItem } from '@/services/dataSourceService';

const PAGE_SIZE = 12;

const IngestionMonitor: React.FC = () => {
  const { t } = useTranslation(['monitor', 'common']);
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const statsQ = useIngestEventStats();
  const eventsQ = useIngestEvents({ pageNumber: page, pageSize: PAGE_SIZE });
  const detailQ = useIngestEventDetail(selectedId, selectedId != null);
  const recordsQ = useIngestProgress(selectedId, 'record', selectedId != null);
  const jsonQ = useIngestProgress(selectedId, 'json', selectedId != null);
  const tasksQ = useIngestProgress(selectedId, 'task', selectedId != null);

  // The collector source databases: ingestion events originate from these.
  // Selected by the param collector=true (mirrors backend storage_helper.py). There can be several.
  const dataSourcesQ = useDataSources();
  const dataSourceHealthQ = useDataSourceHealth();
  const collectorSources = React.useMemo(
    () => (dataSourcesQ.data ?? []).filter(isCollectorDataSource),
    [dataSourcesQ.data],
  );
  const collectorHealthById = React.useMemo(() => {
    const map: Record<string, DataSourceHealthItem> = {};
    for (const s of dataSourceHealthQ.data?.sources ?? []) map[s.dataSourceId] = s;
    return map;
  }, [dataSourceHealthQ.data]);

  // Cache pipeline names for display
  const [pipelineNames, setPipelineNames] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    pipelineMetaService.getAllPipelines().then((all) => {
      const map: Record<string, string> = {};
      for (const p of all) if (p.pipelineId && p.name) map[p.pipelineId] = p.name;
      setPipelineNames(map);
    }).catch(() => undefined);
  }, []);

  const events = React.useMemo(() => eventsQ.data?.data ?? [], [eventsQ.data]);
  const pageCount = eventsQ.data?.pageCount ?? eventsQ.data?.totalPages ?? 1;

  // Default-select the first event once the list loads (drives the detail panel + gauges).
  React.useEffect(() => {
    if (selectedId == null && events.length > 0) setSelectedId(events[0].eventTriggerId);
  }, [events, selectedId]);

  const stats = statsQ.data;
  const countOf = (s: IngestStatus) => stats?.byStatus?.[String(s)] ?? 0;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      {statsQ.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[92px] w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiTile label={t('monitor:kpi.total')} value={stats?.total ?? 0} tone="neutral" />
          <KpiTile label={t('monitor:kpi.executing')} value={countOf(IngestStatus.EXECUTING)} tone="info" />
          <KpiTile label={t('monitor:kpi.success')} value={countOf(IngestStatus.SUCCESS)} tone="success" />
          <KpiTile label={t('monitor:kpi.fail')} value={countOf(IngestStatus.FAIL)} tone="error" />
          <KpiTile label={t('monitor:kpi.waiting')} value={countOf(IngestStatus.WAITING)} tone="warning" />
        </div>
      )}

      {/* Collector source databases — where ingestion events originate (there can be several). */}
      <Card className="p-0">
        <PanelHeader
          title={t('monitor:collectorSourceTitle')}
          extra={collectorSources.length > 0 ? <span className="tabular-nums">{collectorSources.length}</span> : null}
        />
        {collectorSources.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">{t('monitor:collectorSourceNone')}</p>
        ) : (
          <div className="divide-y">
            {collectorSources.map((ds) => {
              const health = collectorHealthById[ds.dataSourceId];
              return (
                <div key={ds.dataSourceId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Database className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <MonoText className="text-sm font-semibold text-foreground">
                      {ds.name ?? ds.dataSourceCode ?? ds.dataSourceId}
                    </MonoText>
                    <span className="inline-flex h-4 items-center rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-muted-foreground">
                      {(ds.dataSourceType ?? 'UNKNOWN').toUpperCase()}
                    </span>
                    {(ds.host || ds.port) && (
                      <MonoText className="text-xs text-muted-foreground">
                        {ds.host ?? ''}
                        {ds.port ? `:${ds.port}` : ''}
                      </MonoText>
                    )}
                  </div>
                  {health && (
                    <div className="flex shrink-0 items-center gap-2">
                      {health.latencyMs != null && (
                        <MonoText className="text-xs text-muted-foreground">{formatDuration(health.latencyMs)}</MonoText>
                      )}
                      <CollectorHealthBadge status={health.status} t={t} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Master-detail: trigger events | per-table results */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Trigger events list */}
        <Card className="p-0">
          <PanelHeader
            title={t('monitor:triggerEvents')}
            extra={eventsQ.data?.total != null ? <span className="tabular-nums">{eventsQ.data.total}</span> : null}
          />
          <div className="max-h-[560px] divide-y overflow-auto">
            {eventsQ.error ? (
              <div className="p-4"><ErrorBanner message={String(eventsQ.error)} onRetry={() => eventsQ.refetch()} /></div>
            ) : eventsQ.isLoading ? (
              <div className="space-y-2 p-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : events.length === 0 ? (
              <EmptyState title={t('monitor:empty')} />
            ) : (
              events.map((e) => {
                const meta = getIngestStatusMeta(e.status);
                const selected = selectedId === e.eventTriggerId;
                return (
                  <div
                    key={e.eventTriggerId}
                    onClick={() => setSelectedId(e.eventTriggerId)}
                    className={cn(
                      'cursor-pointer px-4 py-3 transition-colors',
                      selected ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-300' : 'hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {getEventTypeLabel(e.type)}
                        </span>
                        <StatusPill tone={meta.tone} label={meta.label} />
                      </div>
                      <MonoText className="text-xs text-muted-foreground">#{e.eventTriggerId}</MonoText>
                    </div>
                    <MonoText className="mt-1.5 block truncate text-sm font-medium text-foreground">
                      {e.tableName || (e.pipelineId ? pipelineNames[e.pipelineId] ?? e.pipelineId : '—')}
                    </MonoText>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {e.startTime ? new Date(e.startTime).toLocaleTimeString() : '—'}
                      </span>
                      <MonoText>
                        {e.startTime ? formatDuration(e.endTime ? new Date(e.endTime).getTime() - new Date(e.startTime).getTime() : Date.now() - new Date(e.startTime).getTime()) : '—'}
                      </MonoText>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {page} / {Math.max(1, pageCount)}
            </span>
            <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Per-table results */}
        <Card className="p-0">
          <PanelHeader
            title={t('monitor:sections.results')}
            extra={selectedId != null ? <MonoText>#{selectedId}</MonoText> : null}
          />
          {!selectedId ? (
            <EmptyState title={t('monitor:selectEvent')} />
          ) : detailQ.error ? (
            <div className="p-4"><ErrorBanner message={String(detailQ.error)} onRetry={() => detailQ.refetch()} /></div>
          ) : detailQ.isLoading ? (
            <div className="p-4"><Skeleton className="h-40 w-full" /></div>
          ) : (detailQ.data ?? []).length === 0 ? (
            <EmptyState title={t('common:empty')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.table')}</TableHead>
                  <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.module')}</TableHead>
                  <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.model')}</TableHead>
                  <TableHead className="h-9 px-3 text-right text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.dataCount')}</TableHead>
                  <TableHead className="h-9 px-3 text-right text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.jsonFinished')}</TableHead>
                  <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.percent')}</TableHead>
                  <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide">{t('monitor:detailColumns.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detailQ.data ?? []).map((r, i) => {
                  const meta = getIngestStatusMeta(r.status);
                  return (
                    <TableRow key={i} className={cn('text-xs', r.status === IngestStatus.FAIL && 'bg-red-50/40')}>
                      <TableCell className="px-3 py-2">
                        <MonoText className="block max-w-[180px] truncate text-foreground">{r.tableName ?? '—'}</MonoText>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{r.moduleName ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{r.modelName ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2 text-right tabular-nums">{r.dataCount ?? 0}</TableCell>
                      <TableCell className="px-3 py-2 text-right tabular-nums">{r.jsonFinishedCount ?? 0}/{r.jsonCount ?? 0}</TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ProgressMeter percent={r.percent} tone={meta.tone} className="w-20" />
                          <span className="tabular-nums text-muted-foreground">{formatPercent(r.percent)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2"><StatusPill tone={meta.tone} label={meta.label} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Progress gauges: records / json / tasks */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('monitor:sections.progress')}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {([
            { kind: 'records', label: t('monitor:gauge.records'), q: recordsQ },
            { kind: 'json', label: t('monitor:gauge.json'), q: jsonQ },
            { kind: 'tasks', label: t('monitor:gauge.tasks'), q: tasksQ },
          ] as const).map(({ kind, label, q }) =>
            q.isLoading && selectedId != null ? (
              <Skeleton key={kind} className="h-[104px] w-full" />
            ) : (
              <ProgressGauge
                key={kind}
                label={label}
                finished={q.data?.finished ?? 0}
                unfinished={q.data?.unfinished ?? 0}
                finishedLabel={t('monitor:finished')}
                unfinishedLabel={t('monitor:unfinished')}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
};

const CollectorHealthBadge: React.FC<{
  status: string;
  t: (k: string) => string;
}> = ({ status, t }) => {
  const tone: Tone =
    status === 'ok' ? 'success' : status === 'error' ? 'error' : status === 'timeout' ? 'warning' : 'neutral';
  const label =
    status === 'ok'
      ? t('monitor:collectorHealthOk')
      : status === 'error'
        ? t('monitor:collectorHealthError')
        : t('monitor:collectorHealthSkipped');
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
      tone === 'success' ? 'bg-green-50 text-green-700 border-green-200'
      : tone === 'error' ? 'bg-red-50 text-red-700 border-red-200'
      : tone === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-slate-50 text-slate-600 border-slate-200'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT_CLASS[tone]}`} />
      {label}
    </span>
  );
};

export default IngestionMonitor;
