import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonoText, EmptyState, ErrorBanner } from '@/components/monitor/common';
import { formatDuration } from '@/utils/monitorConstants';
import type { SlowPipeline } from '@/services/pipelineMonitorService';

interface SlowTasksCardProps {
  slowPipelines?: SlowPipeline[];
  nameMap: Record<string, string>;
  sampleSize?: number;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onOpen: (pipelineId: string) => void;
}

const RANK_CLASS = [
  'bg-amber-100 text-amber-700',
  'bg-slate-200 text-slate-600',
  'bg-orange-50 text-orange-600',
];

/** Inefficient-tasks board: top pipelines ranked by average run duration (from the recent-run sample). */
export const SlowTasksCard: React.FC<SlowTasksCardProps> = ({
  slowPipelines,
  nameMap,
  sampleSize,
  isLoading,
  error,
  onRetry,
  onOpen,
}) => {
  const { t } = useTranslation('overview');
  const items = React.useMemo(() => slowPipelines ?? [], [slowPipelines]);
  const maxAvg = React.useMemo(() => Math.max(1, ...items.map((item) => item.avgDurationMs)), [items]);

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-foreground">{t('slowTasks.title')}</h2>
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {t('slowTasks.subtitle', { count: items.length })}
          {sampleSize != null && sampleSize > 0 && (
            <span className="ml-1.5">· {t('slowTasks.sample', { count: sampleSize })}</span>
          )}
        </span>
      </div>

      {error ? (
        <ErrorBanner message={String(error)} onRetry={onRetry} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t('slowTasks.empty')} className="py-8" />
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {items.map((item, index) => {
            const name = nameMap[item.pipelineId] ?? item.pipelineId;
            const barPct = Math.max(4, Math.round((item.avgDurationMs / maxAvg) * 100));
            return (
              <button
                key={item.pipelineId}
                type="button"
                onClick={() => onOpen(item.pipelineId)}
                title={t('slowTasks.openInMonitor')}
                className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left transition-colors first:pt-0 last:pb-0 hover:bg-slate-50"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold tabular-nums',
                    RANK_CLASS[index] ?? 'bg-slate-100 text-slate-500',
                  )}
                >
                  {index + 1}
                </span>
                <MonoText className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{name}</MonoText>
                <span className="hidden shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
                  <span className="tabular-nums">{t('slowTasks.runs', { count: item.runs })}</span>
                  {item.errors > 0 && (
                    <span className="rounded bg-red-50 px-1 font-semibold text-red-600">
                      {t('slowTasks.errors', { count: item.errors })}
                    </span>
                  )}
                </span>
                <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 md:block">
                  <span
                    className={cn('block h-full rounded-full', item.errors > 0 ? 'bg-orange-400' : 'bg-indigo-400')}
                    style={{ width: `${barPct}%` }}
                  />
                </span>
                <span className="flex w-28 shrink-0 items-center justify-end gap-2 text-right">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {formatDuration(item.avgDurationMs)}
                  </span>
                  <MonoText className="hidden text-[10px] text-muted-foreground lg:inline">
                    {t('slowTasks.max')} {formatDuration(item.maxDurationMs)}
                  </MonoText>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default SlowTasksCard;
