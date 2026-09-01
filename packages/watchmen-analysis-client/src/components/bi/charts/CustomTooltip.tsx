import React from 'react';
import type { TooltipProps } from './types';
import { formatMetricValue } from '@/utils/metricValueFormat';

export const CustomTooltip = React.memo(({ active, payload, label, format, unit, currency, valueLabel, total }: TooltipProps & { format?: string; unit?: string; currency?: string; valueLabel?: string; total?: number }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border/60 px-3.5 py-2.5 rounded-xl shadow-xl text-xs outline-none z-50 min-w-[140px]">
        <p className="text-[11px] text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name === 'value' && valueLabel ? valueLabel : entry.name}</span>
              <span className="ml-auto pl-4 font-semibold text-popover-foreground tabular-nums">
                {typeof entry.value === 'number'
                  ? `${formatMetricValue(entry.value, format, currency)}${unit ? ` ${unit}` : ''}${total ? ` (${((entry.value / total) * 100).toFixed(1)}%)` : ''}`
                  : (entry.value ?? '-')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
});
