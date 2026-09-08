/**
 * Shared BI analysis utility functions.
 * Used by both BIAnalysisPage and SharedAnalysisPage to avoid code duplication.
 */

import type { MetricFlowResponse } from '@/model/metricFlow';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { findColumnIndex } from '@/utils/dimensionQuery';
import { resolveDimensionRoles } from '@/components/bi/dimensionRoles';
import type { ChartDatum } from '@/components/bi/charts/types';

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

export interface ChartFacetGroup {
  value: string;
  rows: ChartDatum[];
}

export interface ChartDataset {
  /** Pivoted rows: `date` (time axis) or `name` plus one numeric key per series */
  rows: ChartDatum[];
  /** Present only when a facet dimension is set: one group per facet value */
  facets: ChartFacetGroup[] | null;
  axisIsTime: boolean;
}

export interface ChartTransformOptions {
  axisDimension?: string;
  seriesDimension?: string;
  facetDimension?: string;
  isTimeDimension?: (dim: string) => boolean;
}

const TIME_COLUMN_KEYWORDS = ['date', 'day', 'month', 'week', 'quarter', 'year', 'hour', 'minute', 'second', 'time', 'timestamp', 'datetime', 'created_at', 'updated_at'];

const looksLikeTimeColumn = (name: unknown): boolean =>
  TIME_COLUMN_KEYWORDS.some(k => String(name ?? '').toLowerCase().includes(k));

const fmt = (v: unknown): string => (v === null || v === undefined) ? 'Null' : String(v);

const sortTimeEntries = <T extends { t: string }>(entries: T[]): T[] => {
  const parsed = entries.map(e => ({ ...e, d: Date.parse(e.t) }));
  parsed.sort((a, b) => (Number.isFinite(a.d) && Number.isFinite(b.d)) ? a.d - b.d : a.t.localeCompare(b.t));
  return parsed;
};

/**
 * Resolve which response columns carry the axis / series / facet roles.
 * Explicit roles from the selection win; otherwise the axis prefers a time
 * column and the series is the next remaining dimension (mirrors
 * resolveDimensionRoles, applied to the actual response columns).
 */
export const resolveChartColumns = (
  cols: string[],
  dimIdxs: number[],
  opts: ChartTransformOptions,
): { axisIdx: number; seriesIdx: number; facetIdx: number; axisIsTime: boolean } => {
  const byRole = (dim?: string) => (dim ? findColumnIndex(cols, dim) : -1);

  const axisExplicit = byRole(opts.axisDimension);
  const seriesExplicit = byRole(opts.seriesDimension);
  const facetIdx = byRole(opts.facetDimension);

  const timeIdx = dimIdxs.find(i => looksLikeTimeColumn(cols[i]) || opts.isTimeDimension?.(cols[i] ?? ''));

  // Inference candidates: columns not consumed by an explicit series/facet role
  const taken = new Set([seriesExplicit, facetIdx].filter(i => i >= 0));
  const candidates = dimIdxs.filter(i => !taken.has(i));

  let axisIdx = axisExplicit;
  if (axisIdx < 0) {
    const inferred = typeof timeIdx === 'number' && candidates.includes(timeIdx) ? timeIdx : candidates[0];
    axisIdx = inferred ?? dimIdxs[0] ?? -1;
  }
  const axisIsTime = looksLikeTimeColumn(cols[axisIdx]);

  // The series falls back to the next remaining dimension after the axis
  const seriesIdx = seriesExplicit >= 0 ? seriesExplicit : (candidates.find(i => i !== axisIdx) ?? -1);

  return { axisIdx, seriesIdx, facetIdx, axisIsTime };
};

// Pivot rows into axis × series chart data. Series keys are inserted in
// total-desc order so views derive a deterministic (rank-stable) color order.
const pivotRows = (
  data: unknown[][],
  axisIdx: number,
  seriesIdx: number,
  valueIdx: number,
  axisIsTime: boolean,
): ChartDatum[] => {
  const axisKey = axisIsTime ? 'date' : 'name';
  // series totals: value → total, for deterministic ordering
  const totals = new Map<string, number>();
  const cells = new Map<string, Map<string, number>>();

  for (const row of data) {
    const axisVal = fmt(row[axisIdx]);
    const seriesVal = seriesIdx >= 0 ? fmt(row[seriesIdx]) : 'value';
    const val = Number(row[valueIdx] ?? 0);
    if (!cells.has(axisVal)) cells.set(axisVal, new Map());
    const record = cells.get(axisVal)!;
    record.set(seriesVal, (record.get(seriesVal) ?? 0) + val);
    totals.set(seriesVal, (totals.get(seriesVal) ?? 0) + val);
  }

  const orderedSeries = [...totals.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));

  const result: ChartDatum[] = [];
  for (const [axisVal, seriesValues] of cells.entries()) {
    const datum: ChartDatum = { [axisKey]: axisVal };
    orderedSeries.forEach(key => {
      const v = seriesValues.get(key);
      if (v !== undefined) datum[key] = v;
    });
    result.push(datum);
  }

  if (axisIsTime) {
    const entries = result.map(row => ({ t: String(row.date), row }));
    return sortTimeEntries(entries).map(e => e.row);
  }
  // Categorical axis: rank by row total so the top members read first
  return result.sort((a, b) => {
    const total = (row: ChartDatum) => Object.keys(row)
      .filter(k => k !== axisKey)
      .reduce((sum, k) => sum + (typeof row[k] === 'number' ? row[k] : 0), 0);
    return total(b) - total(a);
  });
};

/**
 * Transform a MetricFlowResponse into chart-ready data using dimension roles:
 * the axis dimension becomes `date`/`name`, the series dimension produces one
 * numeric key per value (real dimension values, never concatenated composite
 * keys), and an optional facet dimension splits the data into small multiples.
 * Remaining detail dimensions stay out of the chart — they are rendered in
 * full by the pivot/data view.
 */
export const transformMetricFlowToChart = (resp: MetricFlowResponse, opts: ChartTransformOptions = {}): ChartDataset => {
  if (!resp || !Array.isArray(resp.column_names) || !Array.isArray(resp.data)) {
    return { rows: [], facets: null, axisIsTime: false };
  }
  const cols = resp.column_names;
  const valueIdx = Math.max(cols.lastIndexOf('value'), cols.length - 1);
  const dimIdxs = cols.map((_, i) => i).filter(i => i !== valueIdx);

  if (dimIdxs.length === 0) {
    const total = resp.data.reduce((sum, row) => sum + Number(row[valueIdx] ?? 0), 0);
    return { rows: [{ value: total }], facets: null, axisIsTime: false };
  }

  const { axisIdx, seriesIdx, facetIdx, axisIsTime } = resolveChartColumns(cols, dimIdxs, opts);

  // No facet dimension: a single pivoted dataset
  if (facetIdx < 0) {
    return { rows: pivotRows(resp.data, axisIdx, seriesIdx, valueIdx, axisIsTime), facets: null, axisIsTime };
  }

  // Facet dimension: one pivoted group per facet value, ordered by group total
  const grouped = new Map<string, unknown[][]>();
  for (const row of resp.data) {
    const facetVal = fmt(row[facetIdx]);
    if (!grouped.has(facetVal)) grouped.set(facetVal, []);
    grouped.get(facetVal)!.push(row);
  }
  const facetTotals = new Map<string, number>();
  for (const row of resp.data) {
    const facetVal = fmt(row[facetIdx]);
    facetTotals.set(facetVal, (facetTotals.get(facetVal) ?? 0) + Number(row[valueIdx] ?? 0));
  }
  const facets = [...grouped.entries()]
    .sort((a, b) => (facetTotals.get(b[0]) ?? 0) - (facetTotals.get(a[0]) ?? 0))
    .map(([value, rows]) => ({ value, rows: pivotRows(rows, axisIdx, seriesIdx, valueIdx, axisIsTime) }));
  return { rows: facets[0]?.rows ?? [], facets, axisIsTime };
};

/**
 * Backward-compatible wrapper: flat pivoted rows without facet grouping.
 */
export const transformMetricFlowToChartData = (resp: MetricFlowResponse): ChartDatum[] =>
  transformMetricFlowToChart(resp).rows;

export const buildGlobalWhere = (filters: Record<string, string>): string | undefined => {
  const parts = Object.entries(filters)
    .map(([k, v]) => [k.trim(), v.trim()] as const)
    .filter(([k, v]) => k.length > 0 && v.length > 0)
    .map(([k, v]) => `${k} = '${v.replace(/'/g, "''")}'`);
  return parts.length > 0 ? parts.join(' AND ') : undefined;
};
