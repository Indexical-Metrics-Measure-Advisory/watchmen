import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { type Tone, TONE_DOT_CLASS } from '@/utils/monitorConstants';

interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  tone?: Tone;
  /** Optional trend chip e.g. "+8.3%" */
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  onClick?: () => void;
}

/** KPI tile: border-first card + 3px top accent bar (tone) + uppercase label + big tabular value + trend chip. */
export const KpiTile: React.FC<KpiTileProps> = ({ label, value, caption, tone = 'neutral', trend, onClick }) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
      )}
      onClick={onClick}
    >
      <span className={cn('absolute left-0 right-0 top-0 h-[3px]', TONE_DOT_CLASS[tone])} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              trend.direction === 'up' && 'text-green-600',
              trend.direction === 'down' && 'text-red-600',
              trend.direction === 'flat' && 'text-muted-foreground',
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </Card>
  );
};

export default KpiTile;
