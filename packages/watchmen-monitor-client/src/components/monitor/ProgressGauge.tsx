import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface ProgressGaugeProps {
  label: string;
  finished: number;
  unfinished: number;
  /** i18n labels passed in by the page (e.g. t('monitor:finished')). */
  finishedLabel: string;
  unfinishedLabel: string;
  className?: string;
}

const SIZE = 72;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** SVG donut gauge showing finished / (finished + unfinished) progress (design's ingestion gauge row). */
export const ProgressGauge: React.FC<ProgressGaugeProps> = ({
  label,
  finished,
  unfinished,
  finishedLabel,
  unfinishedLabel,
  className,
}) => {
  const total = finished + unfinished;
  const ratio = total > 0 ? finished / total : null;
  const complete = ratio === 1;
  return (
    <Card className={cn('flex items-center gap-4 p-4', className)}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-slate-100"
          />
          {ratio != null && ratio > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
              className={complete ? 'stroke-green-500' : 'stroke-orange-500'}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-foreground">
          {ratio == null ? '—' : `${Math.round(ratio * 100)}%`}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
          {finished}
          <span className="text-sm font-normal text-muted-foreground"> / {total}</span>
        </p>
        {unfinished > 0 ? (
          <p className="mt-0.5 text-xs font-medium text-orange-600">
            {unfinished} {unfinishedLabel}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">{finishedLabel}</p>
        )}
      </div>
    </Card>
  );
};

export default ProgressGauge;
