import React from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { EmptyState, ErrorBanner } from '@/components/monitor/common';
import type { PipelineTrendBucket } from '@/services/pipelineMonitorService';

const DONE_COLOR = '#22c55e';
const ERROR_COLOR = '#ef4444';

interface TrendCardProps {
  data?: PipelineTrendBucket[];
  sampleSize?: number;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Custom tooltip: dark popover with per-day done/error/total. */
const TrendTooltip: React.FC<{ active?: boolean; payload?: { payload: PipelineTrendBucket & { label: string } }[] }> = ({
  active,
  payload,
}) => {
  const { t } = useTranslation('overview');
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{bucket.date}</p>
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: DONE_COLOR }} />
        {t('trend.done')} <span className="font-semibold tabular-nums text-foreground">{bucket.done}</span>
      </p>
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ERROR_COLOR }} />
        {t('trend.error')} <span className="font-semibold tabular-nums text-foreground">{bucket.error}</span>
      </p>
      <p className="mt-1 border-t border-slate-100 pt-1 text-muted-foreground">
        {t('trend.total')} <span className="font-semibold tabular-nums text-foreground">{bucket.total}</span>
      </p>
    </div>
  );
};

/** Task-trend card: daily run volume as a stacked done/error bar chart (last 14 days). */
export const TrendCard: React.FC<TrendCardProps> = ({ data, sampleSize, isLoading, error, onRetry }) => {
  const { t } = useTranslation('overview');
  const chartData = React.useMemo(() => (data ?? []).map((b) => ({ ...b, label: b.date.slice(5) })), [data]);
  const totals = React.useMemo(
    () =>
      chartData.reduce(
        (acc, b) => ({ done: acc.done + b.done, error: acc.error + b.error }),
        { done: 0, error: 0 },
      ),
    [chartData],
  );

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-foreground">{t('trend.title')}</h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: DONE_COLOR }} />
            {t('trend.done')} <span className="font-semibold tabular-nums text-green-600">{totals.done}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ERROR_COLOR }} />
            {t('trend.error')} <span className="font-semibold tabular-nums text-red-600">{totals.error}</span>
          </span>
          {sampleSize != null && sampleSize > 0 && (
            <span className="whitespace-nowrap">{t('trend.sample', { count: sampleSize })}</span>
          )}
        </div>
      </div>

      {error ? (
        <ErrorBanner message={String(error)} onRetry={onRetry} />
      ) : isLoading ? (
        <Skeleton className="h-[200px] w-full" />
      ) : chartData.length === 0 ? (
        <EmptyState title={t('trend.empty')} />
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
              <Bar dataKey="done" stackId="runs" fill={DONE_COLOR} radius={[0, 0, 0, 0]} maxBarSize={28} />
              <Bar dataKey="error" stackId="runs" fill={ERROR_COLOR} radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default TrendCard;
