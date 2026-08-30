import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, GitBranch, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration, TONE_DOT_CLASS, TONE_PILL_CLASS, type Tone } from '@/utils/monitorConstants';
import type { PipelineLogInsight } from '@/services/pipelineMonitorService';
import type { TriggerEventStats } from '@/services/ingestMonitorService';

interface EngineOverviewCardProps {
  insight?: PipelineLogInsight;
  eventStats?: TriggerEventStats;
  sourcesTotal: number;
  sourcesOk: number;
  sourcesFailed: number;
  healthChecked: boolean;
  isLoading: boolean;
}

/** An engine row: icon + name + status pill + a wrap of metric chips. */
const EngineRow: React.FC<{
  icon: React.ReactNode;
  name: string;
  tone: Tone;
  statusLabel: string;
  pulse?: boolean;
  metrics: React.ReactNode[];
}> = ({ icon, name, tone, statusLabel, pulse, metrics }) => (
  <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{name}</span>
        <span
          className={cn(
            'inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold',
            TONE_PILL_CLASS[tone],
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT_CLASS[tone], pulse && 'animate-pulse')} />
          {statusLabel}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">{metrics.map((m, i) => <React.Fragment key={i}>{m}</React.Fragment>)}</div>
    </div>
  </div>
);

const Metric: React.FC<{ label?: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <span className={cn('text-[11px] text-muted-foreground', className)}>
    {label && <span className="mr-1">{label}</span>}
    <span className="font-semibold tabular-nums text-foreground">{value}</span>
  </span>
);

/** Engine-overview card: collector engine / pipeline engine / storage connections with realtime health. */
export const EngineOverviewCard: React.FC<EngineOverviewCardProps> = ({
  insight,
  eventStats,
  sourcesTotal,
  sourcesOk,
  sourcesFailed,
  healthChecked,
  isLoading,
}) => {
  const { t } = useTranslation('overview');

  const eventTotal = eventStats?.total ?? 0;
  const eventFail = eventStats?.byStatus?.['3'] ?? 0;
  const eventExecuting = eventStats?.byStatus?.['1'] ?? 0;
  const eventOk = eventStats?.byStatus?.['2'] ?? 0;
  const eventOkPct = eventTotal > 0 ? Math.round((eventOk / eventTotal) * 100) : 100;

  const runTotal = insight?.total ?? 0;
  const runErrors = insight?.byStatus?.['ERROR'] ?? 0;
  const runDone = insight?.byStatus?.['DONE'] ?? 0;
  const runOkPct = runTotal > 0 ? Math.round((runDone / runTotal) * 100) : 100;

  const collectorTone: Tone = eventFail > 0 ? 'error' : eventExecuting > 0 ? 'info' : 'success';
  const pipelineTone: Tone = runErrors > 0 ? 'error' : runTotal === 0 ? 'neutral' : 'success';
  const storageTone: Tone = healthChecked ? (sourcesFailed > 0 ? 'error' : 'success') : 'neutral';

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{t('engines.title')}</h2>
        <span className="text-xs text-muted-foreground">{t('engines.subtitle')}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          <EngineRow
            icon={<ArrowDownToLine className="h-4 w-4 text-indigo-600" />}
            name={t('engines.collector')}
            tone={collectorTone}
            statusLabel={eventFail > 0 ? t('engines.failing') : eventExecuting > 0 ? t('engines.running') : t('engines.healthy')}
            pulse={eventExecuting > 0}
            metrics={[
              <Metric key="events" label={t('engines.events')} value={eventTotal} />,
              <Metric key="ok" label={t('engines.okRate')} value={`${eventOkPct}%`} className={eventOkPct < 100 ? 'text-orange-600' : ''} />,
              <Metric key="exec" label={t('engines.executing')} value={eventExecuting} />,
              eventStats?.avgDurationMs != null && eventStats.avgDurationMs > 0 && (
                <Metric key="avg" label={t('engines.avgDuration')} value={formatDuration(eventStats.avgDurationMs)} />
              ),
            ]}
          />
          <EngineRow
            icon={<GitBranch className="h-4 w-4 text-indigo-600" />}
            name={t('engines.pipelineEngine')}
            tone={pipelineTone}
            statusLabel={runErrors > 0 ? t('engines.failing') : runTotal === 0 ? t('engines.idle') : t('engines.healthy')}
            metrics={[
              <Metric key="runs" label={t('engines.runs')} value={runTotal} />,
              <Metric key="ok" label={t('engines.okRate')} value={`${runOkPct}%`} className={runOkPct < 100 ? 'text-orange-600' : ''} />,
              insight?.avgDurationMs != null && insight.avgDurationMs > 0 && (
                <Metric key="avg" label={t('engines.avgDuration')} value={formatDuration(insight.avgDurationMs)} />
              ),
              insight?.p95DurationMs != null && insight.p95DurationMs > 0 && (
                <Metric key="p95" label={t('engines.p95')} value={formatDuration(insight.p95DurationMs)} />
              ),
              insight && (
                <Metric
                  key="writes"
                  value={
                    <span className="flex gap-1.5">
                      <span className="text-green-600">+{insight.insertCount}</span>
                      <span className="text-blue-600">~{insight.updateCount}</span>
                      <span className="text-red-600">-{insight.deleteCount}</span>
                    </span>
                  }
                />
              ),
            ]}
          />
          <EngineRow
            icon={<Database className="h-4 w-4 text-indigo-600" />}
            name={t('engines.storage')}
            tone={storageTone}
            statusLabel={
              !healthChecked ? t('engines.idle') : sourcesFailed > 0 ? t('engines.failing') : t('engines.healthy')
            }
            metrics={[
              <Metric key="total" label={t('engines.sources')} value={sourcesTotal} />,
              healthChecked ? (
                <Metric
                  key="conn"
                  value={
                    <>
                      <span className="text-green-600">{sourcesOk}</span>
                      <span> / {sourcesTotal}</span>
                      {sourcesFailed > 0 && <span className="ml-1 text-red-600">{t('engines.failedShort', { count: sourcesFailed })}</span>}
                    </>
                  }
                />
              ) : (
                <Metric key="reg" value={t('engines.registeredOnly')} />
              ),
            ]}
          />
        </div>
      )}
    </Card>
  );
};

export default EngineOverviewCard;
