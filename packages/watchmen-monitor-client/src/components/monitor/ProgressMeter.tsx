import React from 'react';
import { cn } from '@/lib/utils';
import { type Tone, TONE_DOT_CLASS } from '@/utils/monitorConstants';

interface ProgressMeterProps {
  /** 0–100 */
  percent?: number | null;
  tone?: Tone;
  label?: React.ReactNode;
  className?: string;
}

/** Thin progress bar with tone-colored fill. */
export const ProgressMeter: React.FC<ProgressMeterProps> = ({ percent = 0, tone = 'info', label, className }) => {
  const value = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className={cn('w-full', className)}>
      {label != null && (
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="tabular-nums">{value.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all', TONE_DOT_CLASS[tone])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

export default ProgressMeter;
