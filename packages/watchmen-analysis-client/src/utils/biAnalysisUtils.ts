/**
 * Shared BI analysis utility functions.
 * Used by both BIAnalysisPage and SharedAnalysisPage to avoid code duplication.
 */

import type { MetricFlowResponse } from '@/model/metricFlow';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

export const toCustomRangeString = (range?: DateRange): string | null => {
  if (range?.from && range?.to) return `Custom:${formatDate(range.from)}:${formatDate(range.to)}`;
  return null;
};

export const toTimeRangeValue = (range: string, customDateRange?: DateRange): string | null => {
  if (range !== 'Custom') return range;
  return toCustomRangeString(customDateRange);
};

export const timeRangeToBounds = (range: string, customDateRange?: DateRange): { start: string; end: string } => {
  if (range.startsWith('Custom:')) {
    const parts = range.split(':');
    if (parts.length === 3) return { start: parts[1], end: parts[2] };
  }

  if (range === 'Custom') {
    const custom = toCustomRangeString(customDateRange);
    if (custom) {
      const [, start, end] = custom.split(':');
      return { start, end };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start: formatDate(start), end: formatDate(end) };
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  switch (range) {
    case 'Past 7 days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'Past 30 days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'Past 90 days':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'Past year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toDateStr(startDate), end: toDateStr(endDate) };
};

export const transformMetricFlowToChartData = (resp: MetricFlowResponse): Record<string, string | number | null | undefined>[] => {
  if (!resp || !Array.isArray(resp.column_names) || !Array.isArray(resp.data)) return [];
  const cols = resp.column_names;
  const valueIdx = Math.max(cols.lastIndexOf('value'), cols.length - 1);
  const dimIdxs = cols.map((_, i) => i).filter(i => i !== valueIdx);
  const timeKeywords = ['date', 'day', 'month', 'week', 'quarter', 'year', 'hour', 'minute', 'second', 'time', 'timestamp', 'datetime', 'created_at', 'updated_at'];
  const timeIdx = dimIdxs.find(i => timeKeywords.some(k => String(cols[i] ?? '').toLowerCase().includes(k)));

  const fmt = (v: unknown) => (v === null || v === undefined) ? 'Null' : String(v);

  type ChartDatum = Record<string, string | number | null | undefined>;

  // Case: Time Series (Single Dimension)
  if (dimIdxs.length === 1 && typeof timeIdx === 'number') {
    const acc = new Map<string, number>();
    for (const row of resp.data) {
      const t = fmt(row[timeIdx]);
      const v = Number(row[valueIdx] ?? 0);
      acc.set(t, (acc.get(t) ?? 0) + v);
    }
    const entries = Array.from(acc.entries());
    const parsed = entries.map(([t, v]) => ({ t, v, d: Date.parse(t) }));
    parsed.sort((a, b) => (Number.isFinite(a.d) && Number.isFinite(b.d)) ? a.d - b.d : a.t.localeCompare(b.t));
    return parsed.map(p => ({ date: p.t, value: p.v }));
  }

  // Case: Multi-dimensional (Pivot)
  if (dimIdxs.length >= 2) {
    let mainAxisIdx = dimIdxs[0];
    let groupIdx = dimIdxs[1];
    let isTimeAxis = false;

    // If there is a time dimension, force it to be the X-axis
    if (typeof timeIdx === 'number') {
      mainAxisIdx = timeIdx;
      const nonTimeIdx = dimIdxs.find(i => i !== timeIdx);
      if (nonTimeIdx !== undefined) {
        groupIdx = nonTimeIdx;
      }
      isTimeAxis = true;
    }

    const pivotMap = new Map<string, ChartDatum>();
    for (const row of resp.data) {
      const axisVal = fmt(row[mainAxisIdx]);
      const groupVal = fmt(row[groupIdx]);
      const val = Number(row[valueIdx] ?? 0);

      if (!pivotMap.has(axisVal)) {
        pivotMap.set(axisVal, { [isTimeAxis ? 'date' : 'name']: axisVal });
      }
      const record = pivotMap.get(axisVal)!;
      const cur = record[groupVal];
      record[groupVal] = (typeof cur === 'number' ? cur : 0) + val;
    }

    const result = Array.from(pivotMap.values());

    // Sort by time if it is a time axis
    if (isTimeAxis) {
       result.sort((a, b) => {
         const da = Date.parse(String(a.date));
         const db = Date.parse(String(b.date));
         if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
         return String(a.date).localeCompare(String(b.date));
       });
    }

    return result;
  }

  // Case: Single non-time dimension
  return resp.data.map(row => {
    const nameParts = dimIdxs.map(i => fmt(row[i])).filter(s => s.length > 0);
    const name = nameParts.length > 0 ? nameParts.join(' · ') : 'Total';
    const value = Number(row[valueIdx] ?? 0);
    return { name, value };
  });
};

export const buildGlobalWhere = (filters: Record<string, string>): string | undefined => {
  const parts = Object.entries(filters)
    .map(([k, v]) => [k.trim(), v.trim()] as const)
    .filter(([k, v]) => k.length > 0 && v.length > 0)
    .map(([k, v]) => `${k} = '${v.replace(/'/g, "''")}'`);
  return parts.length > 0 ? parts.join(' AND ') : undefined;
};
