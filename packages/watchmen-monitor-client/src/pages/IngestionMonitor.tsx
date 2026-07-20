import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusPill } from '@/components/monitor/StatusPill';
import { ProgressMeter } from '@/components/monitor/ProgressMeter';
import { MonoText, EmptyState, ErrorBanner } from '@/components/monitor/common';
import { useIngestEvents, useIngestEventDetail, useIngestProgress, useDataSources, useDataSourceHealth } from '@/hooks/useMonitorQueries';
import {
  getIngestStatusMeta,
  getEventTypeLabel,
  formatDuration,
  formatPercent,
  TONE_DOT_CLASS,
  type Tone,
} from '@/utils/monitorConstants';
import { pipelineMetaService } from '@/services/pipelineMetaService';
import { isCollectorDataSource } from '@/services/dataSourceService';
import { Database } from 'lucide-react';

const PAGE_SIZE = 12;

const IngestionMonitor: React.FC = () => {
  const { t } = useTranslation(['monitor', 'common']);
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [subtab, setSubtab] = React.useState('events');

  const eventsQ = useIngestEvents({ pageNumber: page, pageSize: PAGE_SIZE });
  const detailQ = useIngestEventDetail(selectedId, subtab === 'detail');
  const recordsQ = useIngestProgress(selectedId, 'record', subtab === 'records');
  const jsonQ = useIngestProgress(selectedId, 'json', subtab === 'json');
  const tasksQ = useIngestProgress(selectedId, 'task', subtab === 'tasks');

  // The collector source database: ingestion events originate from here.
  // Selected by the param collector=true (mirrors backend storage_helper.py).
  const dataSourcesQ = useDataSources();
  const dataSourceHealthQ = useDataSourceHealth();
  const collectorSource = React.useMemo(
    () => (dataSourcesQ.data ?? []).find(isCollectorDataSource) ?? null,
    [dataSourcesQ.data],
  );
  const collectorHealth = React.useMemo(() => {
    const sources = dataSourceHealthQ.data?.sources ?? [];
    return collectorSource ? sources.find((s) => s.dataSourceId === collectorSource.dataSourceId) : undefined;
  }, [dataSourceHealthQ.data, collectorSource]);

  // Cache pipeline names for display
  const [pipelineNames, setPipelineNames] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    pipelineMetaService.getAllPipelines().then((all) => {
      const map: Record<string, string> = {};
      for (const p of all) if (p.pipelineId && p.name) map[p.pipelineId] = p.name;
      setPipelineNames(map);
    }).catch(() => undefined);
  }, []);

  const events = eventsQ.data?.data ?? [];
  const pageCount = eventsQ.data?.pageCount ?? eventsQ.data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Collector source database — where ingestion events originate. */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{t('monitor:collectorSourceTitle')}</p>
            {collectorSource ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <MonoText className="text-sm font-semibold text-foreground">
                  {collectorSource.name ?? collectorSource.dataSourceCode ?? collectorSource.dataSourceId}
                </MonoText>
                <span className="inline-flex h-4 items-center rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {(collectorSource.dataSourceType ?? 'UNKNOWN').toUpperCase()}
                </span>
                {(collectorSource.host || collectorSource.port) && (
                  <MonoText className="text-xs text-muted-foreground">
                    {collectorSource.host ?? ''}
                    {collectorSource.port ? `:${collectorSource.port}` : ''}
                  </MonoText>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">{t('monitor:collectorSourceNone')}</p>
            )}
          </div>
          {collectorSource && collectorHealth && (
            <div className="flex shrink-0 items-center gap-2">
              {collectorHealth.latencyMs != null && (
                <MonoText className="text-xs text-muted-foreground">{formatDuration(collectorHealth.latencyMs)}</MonoText>
              )}
              <CollectorHealthBadge status={collectorHealth.status} t={t} />
            </div>
          )}
        </div>
      </Card>
      <Tabs value={subtab} onValueChange={setSubtab}>
        <TabsList>
          <TabsTrigger value="events">{t('monitor:subtabs.events')}</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selectedId}>{t('monitor:subtabs.detail')}</TabsTrigger>
          <TabsTrigger value="records" disabled={!selectedId}>{t('monitor:subtabs.records')}</TabsTrigger>
          <TabsTrigger value="json" disabled={!selectedId}>{t('monitor:subtabs.json')}</TabsTrigger>
          <TabsTrigger value="tasks" disabled={!selectedId}>{t('monitor:subtabs.tasks')}</TabsTrigger>
        </TabsList>

        {/* Trigger Events list */}
        <TabsContent value="events" className="mt-4">
          {eventsQ.error ? (
            <ErrorBanner message={String(eventsQ.error)} onRetry={() => eventsQ.refetch()} />
          ) : eventsQ.isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : events.length === 0 ? (
            <EmptyState title={t('monitor:empty')} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {events.map((e) => {
                  const meta = getIngestStatusMeta(e.status);
                  const selected = selectedId === e.eventTriggerId;
                  return (
                    <Card
                      key={e.eventTriggerId}
                      className={`cursor-pointer p-4 transition-shadow hover:shadow-md ${
                        selected ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedId(e.eventTriggerId);
                        setSubtab('detail');
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {getEventTypeLabel(e.type)}
                          </span>
                          <StatusPill tone={meta.tone} label={meta.label} />
                        </div>
                        <MonoText className="text-xs text-muted-foreground">#{e.eventTriggerId}</MonoText>
                      </div>
                      <MonoText className="block truncate text-sm font-medium text-foreground">
                        {e.tableName || (e.pipelineId ? pipelineNames[e.pipelineId] ?? e.pipelineId : '—')}
                      </MonoText>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-muted-foreground">{t('monitor:columns.start')}</p>
                          <p className="font-medium tabular-nums">
                            {e.startTime ? new Date(e.startTime).toLocaleTimeString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('monitor:detailColumns.status')}</p>
                          <p className="font-medium">{e.isFinished ? 'Done' : 'Run'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('monitor:columns.duration')}</p>
                          <p className="font-medium tabular-nums">
                            {e.startTime ? formatDuration(e.endTime ? new Date(e.endTime).getTime() - new Date(e.startTime).getTime() : Date.now() - new Date(e.startTime).getTime()) : '—'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              {/* Pagination */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page} / {Math.max(1, pageCount)}
                </span>
                <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Per-table results */}
        <TabsContent value="detail" className="mt-4">
          {!selectedId ? (
            <EmptyState title={t('monitor:selectEvent')} />
          ) : detailQ.error ? (
            <ErrorBanner message={String(detailQ.error)} onRetry={() => detailQ.refetch()} />
          ) : detailQ.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_1.2fr_0.8fr] border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{t('monitor:detailColumns.table')}</span>
                <span>{t('monitor:detailColumns.module')}</span>
                <span>{t('monitor:detailColumns.model')}</span>
                <span>{t('monitor:detailColumns.dataCount')}</span>
                <span>{t('monitor:detailColumns.jsonFinished')}</span>
                <span>{t('monitor:detailColumns.percent')}</span>
                <span>{t('monitor:detailColumns.status')}</span>
              </div>
              {(detailQ.data ?? []).map((r, i) => {
                const meta = getIngestStatusMeta(r.status);
                return (
                  <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_1.2fr_0.8fr] items-center border-b px-3 py-2 text-xs last:border-0">
                    <MonoText className="truncate text-foreground">{r.tableName ?? '—'}</MonoText>
                    <span className="text-muted-foreground">{r.moduleName ?? '—'}</span>
                    <span className="text-muted-foreground">{r.modelName ?? '—'}</span>
                    <span className="tabular-nums">{r.dataCount ?? 0}</span>
                    <span className="tabular-nums">{r.jsonFinishedCount ?? 0}/{r.jsonCount ?? 0}</span>
                    <ProgressMeter percent={r.percent} tone={meta.tone} />
                    <StatusPill tone={meta.tone} label={meta.label} />
                  </div>
                );
              })}
              {(detailQ.data ?? []).length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t('common:empty')}</div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Progress counts: records / json / tasks share the same shape */}
        {(['records', 'json', 'tasks'] as const).map((kind) => {
          const q = kind === 'records' ? recordsQ : kind === 'json' ? jsonQ : tasksQ;
          const data = q.data;
          return (
            <TabsContent key={kind} value={kind} className="mt-4">
              {!selectedId ? (
                <EmptyState title={t('monitor:selectEvent')} />
              ) : q.error ? (
                <ErrorBanner message={String(q.error)} onRetry={() => q.refetch()} />
              ) : q.isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('monitor:unfinished')}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-orange-600">{data?.unfinished ?? 0}</p>
                  </Card>
                  <Card className="p-6 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('monitor:finished')}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-green-600">{data?.finished ?? 0}</p>
                  </Card>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
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
