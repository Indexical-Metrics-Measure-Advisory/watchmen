import { useMemo, useCallback } from 'react';
import { format, isValid } from 'date-fns';
import type { BIChartCard } from '@/model/biAnalysis';
import type { ChartDatum, ChartDatumValue } from './types';

export const useChartAxis = (card: BIChartCard, data: ChartDatum[]) => {
  const isTime = useMemo(() => data.length > 0 && typeof data[0].date === 'string', [data]);
  const xKey = isTime ? 'date' : 'name';

  const formatTimeAxis = useCallback((value: ChartDatumValue) => {
    if (!isTime || !value) return value == null ? '' : String(value);

    const granularity = card.selection?.timeGranularity;

    if (typeof value === 'string') {
      // Handle Year specifically to avoid timezone shifts for "YYYY" string
      if (granularity === 'year' && /^\d{4}$/.test(value)) {
        return String(value);
      }
      
      // Handle Quarter specifically for "YYYY/Q" or "YYYY-Q" format (e.g. 2023/1, 2023-2)
      if (granularity === 'quarter') {
        const quarterMatch = value.match(/^(\d{4})[-/](\d{1})$/);
        if (quarterMatch) {
          const year = parseInt(quarterMatch[1]);
          const quarter = parseInt(quarterMatch[2]);
          if (quarter >= 1 && quarter <= 4) {
             return format(new Date(year, (quarter - 1) * 3, 1), 'yyyy-QQQ');
          }
        }
      }

      // Try parsing common formats
      // If it looks like a month "YYYY-MM"
      if (/^\d{4}-\d{2}$/.test(value)) {
        const [y, m] = value.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        if (isValid(d)) return format(d, 'MMM yyyy');
      }

      // If it looks like "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const d = new Date(value);
        if (isValid(d)) {
          if (granularity === 'month') return format(d, 'MMM yyyy');
          if (granularity === 'year') return format(d, 'yyyy');
          if (granularity === 'quarter') return format(d, 'yyyy-QQQ');
          if (granularity === 'week') return format(d, 'MMM d');
          return format(d, 'MMM d, yyyy');
        }
      }
    }

    return String(value);
  }, [isTime, card.selection?.timeGranularity]);

  const formatYAxis = useCallback((value: number) => {
    if (value === 0) return '0';
    const abs = Math.abs(value);
    if (abs >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  }, []);

  const commonXAxisProps = useMemo(() => ({
    dataKey: xKey,
    tickFormatter: formatTimeAxis,
    tick: { fontSize: 11, fill: 'currentColor' },
    tickLine: false,
    axisLine: { stroke: 'currentColor', opacity: 0.2 },
    dy: 10,
    minTickGap: 30,
  }), [xKey, formatTimeAxis]);

  const commonYAxisProps = useMemo(() => ({
    tickFormatter: formatYAxis,
    tick: { fontSize: 11, fill: 'currentColor' },
    tickLine: false,
    axisLine: false,
    dx: -10,
    width: 50,
  }), [formatYAxis]);

  const commonGridProps = useMemo(() => ({
    strokeDasharray: '3 3',
    vertical: false,
    stroke: 'currentColor',
    opacity: 0.1,
  }), []);

  return {
    isTime,
    xKey,
    commonXAxisProps,
    commonYAxisProps,
    commonGridProps,
    formatTimeAxis,
    formatYAxis,
  };
};
