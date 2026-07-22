import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight, Play } from 'lucide-react';
import { StatusPill } from '@/components/monitor/StatusPill';
import { KpiTile } from '@/components/monitor/KpiTile';
import { MonoText, EmptyState, ErrorBanner, PanelHeader } from '@/components/monitor/common';
import { usePipelineLogs, useAllPipelines, usePipelineLogStats } from '@/hooks/useMonitorQueries';
import { pipelineMonitorService } from '@/services/pipelineMonitorService';
import { getPipelineLogStatusMeta, formatDuration, TONE_DOT_CLASS } from '@/utils/monitorConstants';
import { MonitorLogStatus, type PipelineMonitorLog, type PipelineMonitorLogCriteria } from '@/models/pipeline.models';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 20;

/** Indented, collapsible node row for the stages→units→actions DAG. */
const TreeNode: React.FC<{
  depth: number;
  label: React.ReactNode;
  meta?: React.ReactNode;
  status?: MonitorLogStatus | string | null;
  duration?: number | null;
  error?: string | null;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}> = ({ depth, label, meta, status, duration, error, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const sm = getPipelineLogStatusMeta(status);
  const hasChildren = !!children;
  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 pr-3 ${hasChildren ? 'cursor-pointer hover:bg-muted/40' : ''}`}
        style={{ paddingLeft: depth * 18 + 12 }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <span className="text-sm font-medium text-foreground">{label}</span>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        <span className="ml-auto flex items-center gap-3">
          {duration != null && <MonoText className="text-xs text-muted-foreground">{formatDuration(duration)}</MonoText>}
          <StatusPill tone={sm.tone} label={sm.label} />
        </span>
      </div>
      {error && (
        <pre
          className="mb-2 mr-3 max-h-32 overflow-auto rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
          style={{ marginLeft: depth * 18 + 28 }}
        >
          {error}
        </pre>
      )}
      {open && hasChildren && <div>{children}</div>}
    </div>
  );
};

const PipelineMonitor: React.FC = () => {
  const { t } = useTranslation(['pipeline', 'common']);
  const [filters, setFilters] = React.useState<PipelineMonitorLogCriteria>({
    pageNumber: 1,
    pageSize: PAGE_SIZE,
    status: null,
    pipelineId: null,
    topicId: null,
    traceId: null,
    startDate: null,
    endDate: null,
  });
  const [selectedUid, setSelectedUid] = React.useState<string | null>(null);

  const logsQ = usePipelineLogs(filters);
  const pipelinesQ = useAllPipelines();
  // Aggregated KPIs follow the same entity filters as the log list (status/trace excluded).
  const statsQ = usePipelineLogStats({
    pipelineId: filters.pipelineId ?? undefined,
    topicId: filters.topicId ?? undefined,
    startDate: filters.startDate ?? undefined,
    endDate: filters.endDate ?? undefined,
  });

  const pipelineName = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of pipelinesQ.data ?? []) if (p.pipelineId && p.name) map[p.pipelineId] = p.name;
    return map;
  }, [pipelinesQ.data]);

  const logs = logsQ.data?.data ?? [];
  const pageCount = logsQ.data?.pageCount ?? 1;
  const selected = logs.find((l) => l.uid === selectedUid) ?? null;

  const stats = statsQ.data;
  const doneCount = stats?.byStatus?.[MonitorLogStatus.DONE] ?? 0;
  const ignoredCount = stats?.byStatus?.[MonitorLogStatus.IGNORED] ?? 0;
  const errorCount = stats?.byStatus?.[MonitorLogStatus.ERROR] ?? 0;
  const successRate = stats != null && stats.total > 0 ? `${((doneCount / stats.total) * 100).toFixed(1)}%` : '—';

  const setField = <K extends keyof PipelineMonitorLogCriteria>(key: K, value: PipelineMonitorLogCriteria[K]) => {
    setFilters((f) => ({ ...f, [key]: value, pageNumber: 1 }));
  };

  const rerun = async (log: PipelineMonitorLog) => {
    if (!log.uid) return;
    try {
      await pipelineMonitorService.rerunByUid(log.uid);
      toast.success(t('pipeline:rerunStarted'));
    } catch (e) {
      toast.error(t('pipeline:rerunFailed'), { description: String(e) });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('pipeline:filters.pipeline')}</label>
            <Select
              value={filters.pipelineId ?? 'all'}
              onValueChange={(v) => setField('pipelineId', v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                {(pipelinesQ.data ?? []).map((p) => (
                  <SelectItem key={p.pipelineId} value={p.pipelineId!}>{p.name ?? p.pipelineId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('pipeline:filters.status')}</label>
            <Select
              value={filters.status ?? 'all'}
              onValueChange={(v) => setField('status', v === 'all' ? null : (v as MonitorLogStatus))}
            >
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                <SelectItem value={MonitorLogStatus.DONE}>DONE</SelectItem>
                <SelectItem value={MonitorLogStatus.IGNORED}>IGNORED</SelectItem>
                <SelectItem value={MonitorLogStatus.ERROR}>ERROR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('pipeline:filters.traceId')}</label>
            <Input
              className="w-56 h-9"
              placeholder="trace-id"
              value={filters.traceId ?? ''}
              onChange={(e) => setField('traceId', e.target.value || null)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => logsQ.refetch()}>
            {t('common:refresh')}
          </Button>
        </div>
      </Card>

      {/* KPI row */}
      {statsQ.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            label={t('pipeline:kpi.total')}
            value={stats?.total ?? 0}
            tone="neutral"
            caption={stats?.avgDurationMs != null ? `${t('pipeline:kpi.avgDuration')} ${formatDuration(stats.avgDurationMs)}` : undefined}
          />
          <KpiTile
            label={t('pipeline:kpi.successRate')}
            value={successRate}
            tone="success"
            caption={stats != null ? <span className="tabular-nums">{doneCount} / {stats.total}</span> : undefined}
          />
          <KpiTile label={t('pipeline:kpi.ignored')} value={ignoredCount} tone="warning" />
          <KpiTile label={t('pipeline:kpi.errors')} value={errorCount} tone="error" />
        </div>
      )}

      {/* Master-detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Log list */}
        <Card className="p-0">
          <PanelHeader
            title={t('pipeline:sections.logs')}
            extra={logsQ.data?.itemCount != null ? <span className="tabular-nums">{logsQ.data.itemCount}</span> : null}
          />
          <div className="max-h-[640px] overflow-auto">
            {logsQ.error ? (
              <div className="p-4"><ErrorBanner message={String(logsQ.error)} onRetry={() => logsQ.refetch()} /></div>
            ) : logsQ.isLoading ? (
              <div className="space-y-2 p-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : logs.length === 0 ? (
              <EmptyState title={t('pipeline:empty')} />
            ) : (
              logs.map((log) => {
                const sm = getPipelineLogStatusMeta(log.status);
                const active = log.uid === selectedUid;
                return (
                  <div
                    key={log.uid}
                    onClick={() => setSelectedUid(log.uid ?? null)}
                    className={`flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-0 ${
                      active ? 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-300' : 'hover:bg-muted/40'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT_CLASS[sm.tone]}`} />
                    <div className="min-w-0 flex-1">
                      <MonoText className="block truncate text-sm font-medium text-foreground">
                        {log.pipelineId ? (pipelineName[log.pipelineId] ?? log.pipelineId) : '—'}
                      </MonoText>
                      <MonoText className="text-xs text-muted-foreground">{log.traceId ?? ''}</MonoText>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <MonoText className="text-xs text-muted-foreground">{formatDuration(log.spentInMills)}</MonoText>
                      <StatusPill tone={sm.tone} label={sm.label} dotOnly />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{filters.pageNumber} / {Math.max(1, pageCount)}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={(filters.pageNumber ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, pageNumber: (f.pageNumber ?? 1) - 1 }))}>{t('common:previous')}</Button>
              <Button size="sm" variant="outline" disabled={(filters.pageNumber ?? 1) >= pageCount}
                onClick={() => setFilters((f) => ({ ...f, pageNumber: (f.pageNumber ?? 1) + 1 }))}>{t('common:next')}</Button>
            </div>
          </div>
        </Card>

        {/* Detail column: header card / value diff card / stages card */}
        <div className="space-y-4">
          <Card className="p-4">
            {!selected ? (
              <EmptyState title={t('pipeline:empty')} />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={getPipelineLogStatusMeta(selected.status).tone} label={getPipelineLogStatusMeta(selected.status).label} />
                    <MonoText className="text-sm font-semibold text-foreground">
                      {selected.pipelineId ? (pipelineName[selected.pipelineId] ?? selected.pipelineId) : '—'}
                    </MonoText>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <MonoText>{selected.traceId}</MonoText>
                    <span>{selected.startTime ? formatDistanceToNow(new Date(selected.startTime), { addSuffix: true }) : ''}</span>
                    <span className="tabular-nums">{formatDuration(selected.spentInMills)}</span>
                  </div>
                </div>
                <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => rerun(selected)}>
                  <Play className="mr-1 h-3.5 w-3.5" />{t('pipeline:rerun')}
                </Button>
              </div>
            )}
          </Card>

          {/* Old / new value diff */}
          {selected && (selected.oldValue != null || selected.newValue != null) && (
            <Card className="p-0">
              <PanelHeader title={t('pipeline:sections.valueDiff')} />
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="overflow-hidden rounded-md border border-red-200/70 bg-red-50/50">
                  <p className="border-b border-red-200/70 px-3 py-1.5 text-xs font-medium text-red-700">{t('pipeline:detail.oldValue')}</p>
                  <pre className="max-h-40 overflow-auto p-3 text-xs">{JSON.stringify(selected.oldValue ?? {}, null, 2)}</pre>
                </div>
                <div className="overflow-hidden rounded-md border border-green-200/70 bg-green-50/50">
                  <p className="border-b border-green-200/70 px-3 py-1.5 text-xs font-medium text-green-700">{t('pipeline:detail.newValue')}</p>
                  <pre className="max-h-40 overflow-auto p-3 text-xs">{JSON.stringify(selected.newValue ?? {}, null, 2)}</pre>
                </div>
              </div>
            </Card>
          )}

          {/* Nested DAG tree */}
          {selected && (
            <Card className="p-0">
              <PanelHeader title={t('pipeline:detail.stages')} />
              <div className="py-1.5">
                {(selected.stages ?? []).length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">{t('common:empty')}</p>
                )}
                {(selected.stages ?? []).map((stage, si) => (
                  <TreeNode
                    key={stage.stageId ?? si}
                    depth={0}
                    label={stage.name ?? stage.stageId ?? `Stage ${si + 1}`}
                    status={stage.status}
                    duration={stage.spentInMills}
                    error={stage.error}
                    defaultOpen={stage.status === MonitorLogStatus.ERROR}
                  >
                    {(stage.units ?? []).map((unit, ui) => (
                      <TreeNode
                        key={unit.unitId ?? ui}
                        depth={1}
                        label={unit.name ?? unit.unitId ?? `Unit ${ui + 1}`}
                        status={unit.status}
                        duration={unit.spentInMills}
                        error={unit.error}
                        defaultOpen={unit.status === MonitorLogStatus.ERROR}
                      >
                        {(unit.actions ?? []).map((action, ai) => (
                          <TreeNode
                            key={action.uid ?? ai}
                            depth={2}
                            label={<span>{action.type} <span className="text-xs text-muted-foreground">({action.actionId})</span></span>}
                            meta={
                              (action.insertCount || action.updateCount || action.deleteCount) ? (
                                <span className="flex gap-2 text-[10px]">
                                  <span className="text-green-600">+{action.insertCount ?? 0}</span>
                                  <span className="text-blue-600">~{action.updateCount ?? 0}</span>
                                  <span className="text-red-600">-{action.deleteCount ?? 0}</span>
                                </span>
                              ) : undefined
                            }
                            status={action.status}
                            duration={action.spentInMills}
                            error={action.error}
                          />
                        ))}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineMonitor;
