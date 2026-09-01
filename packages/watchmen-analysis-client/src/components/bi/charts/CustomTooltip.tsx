import React from 'react';
import type { TooltipProps } from './types';
import { formatMetricValue } from '@/utils/metricValueFormat';

export const CustomTooltip = React.memo(({ active, payload, label, format, unit, currency, valueLabel, total }: TooltipProps & { format?: string; unit?: string; currency?: string; valueLabel?: string; total?: number }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-lg text-xs outline-none z-50">
        <p className="font-semibold mb-1.5 text-popover-foreground">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name === 'value' && valueLabel ? valueLabel : entry.name}:</span>
              <span className="font-medium text-popover-foreground tabular-nums">
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
