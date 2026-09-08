import type { MetricFlowResponse } from '@/model/metricFlow';
import { resolveChartColumns } from '@/utils/biAnalysisUtils';
import type { ChartTransformOptions } from '@/utils/biAnalysisUtils';

/**
 * Pure cross-tab (pivot) model built from a raw MetricFlowResponse.
 *
 * Rows are the axis/facet/detail dimensions (every dimension that is not the
 * series), columns are the series dimension values — so a query with any
 * number of dimensions is displayed at full fidelity, which is exactly the
 * view complex multi-dimension cards fall back to.
 */

export interface PivotColumn {
  key: string;
  total: number;
}

export interface PivotRowModel {
  key: string;
  /** One display cell per row dimension */
  cells: string[];
  values: Record<string, number>;
  total: number;
}

export interface PivotModel {
  /** Header label per row-dimension column */
  rowDimLabels: string[];
  /** Series values as pivot columns, ordered by total desc */
  columns: PivotColumn[];
  rows: PivotRowModel[];
  columnTotals: Record<string, number>;
  grandTotal: number;
  truncated: boolean;
  /** Header for the single measure column when no series dimension exists */
  measureLabel: string;
}

export const MAX_PIVOT_COLUMNS = 12;
export const MAX_PIVOT_ROWS = 200;

const fmt = (v: unknown): string => (v === null || v === undefined) ? 'Null' : String(v);

export const buildPivotModel = (
  resp: MetricFlowResponse,
  opts: ChartTransformOptions = {},
  othersLabel = 'Others',
): PivotModel | null => {
  if (!resp || !Array.isArray(resp.column_names) || !Array.isArray(resp.data) || resp.data.length === 0) {
    return null;
  }
  const cols = resp.column_names;
  const valueIdx = Math.max(cols.lastIndexOf('value'), cols.length - 1);
  const dimIdxs = cols.map((_, i) => i).filter(i => i !== valueIdx);
  if (dimIdxs.length === 0) return null;

  const { axisIdx, seriesIdx, facetIdx } = resolveChartColumns(cols, dimIdxs, opts);
  const detailIdxs = dimIdxs.filter(i => i !== axisIdx && i !== seriesIdx && i !== facetIdx);
  const rowDimIdxs = [axisIdx, ...(facetIdx >= 0 ? [facetIdx] : []), ...detailIdxs].filter(i => i >= 0);
  const rowDimLabels = rowDimIdxs.map(i => String(cols[i] ?? ''));

  // Pivot columns: series values ordered by total desc, overflow folded into Others
  const seriesTotals = new Map<string, number>();
  if (seriesIdx >= 0) {
    for (const row of resp.data) {
      const key = fmt(row[seriesIdx]);
      seriesTotals.set(key, (seriesTotals.get(key) ?? 0) + Number(row[valueIdx] ?? 0));
    }
  }
  const orderedSeries = [...seriesTotals.keys()].sort((a, b) => (seriesTotals.get(b) ?? 0) - (seriesTotals.get(a) ?? 0));
  const hasSeries = seriesIdx >= 0;
  const keptSeries = orderedSeries.slice(0, MAX_PIVOT_COLUMNS - 1);
  const foldedSet = new Set(orderedSeries.slice(MAX_PIVOT_COLUMNS - 1));
  const columns: PivotColumn[] = hasSeries
    ? [
        ...keptSeries.map(key => ({ key, total: seriesTotals.get(key) ?? 0 })),
        ...(foldedSet.size > 0 ? [{ key: othersLabel, total: [...foldedSet].reduce((sum, k) => sum + (seriesTotals.get(k) ?? 0), 0) }] : []),
      ]
    : [];

  // Aggregate rows: row key → { display cells, value per series }
  const rowMap = new Map<string, PivotRowModel>();
  for (const row of resp.data) {
    const cells = rowDimIdxs.map(i => fmt(row[i]));
    const key = cells.join('\u0001');
    let entry = rowMap.get(key);
    if (!entry) {
      entry = { key, cells, values: {}, total: 0 };
      rowMap.set(key, entry);
    }
    const val = Number(row[valueIdx] ?? 0);
    entry.total += val;
    if (hasSeries) {
      const seriesVal = fmt(row[seriesIdx]);
      const columnKey = foldedSeries.includes(seriesVal) ? othersLabel : seriesVal;
      entry.values[columnKey] = (entry.values[columnKey] ?? 0) + val;
    } else {
      entry.values[cols[valueIdx]] = (entry.values[cols[valueIdx]] ?? 0) + val;
    }
  }

  const allRows = [...rowMap.values()].sort((a, b) => b.total - a.total);
  const rows = allRows.slice(0, MAX_PIVOT_ROWS);

  const columnTotals: Record<string, number> = {};
  let grandTotal = 0;
  for (const rowModel of allRows) {
    for (const [columnKey, value] of Object.entries(rowModel.values)) {
      columnTotals[columnKey] = (columnTotals[columnKey] ?? 0) + value;
    }
    grandTotal += rowModel.total;
  }

  return {
    rowDimLabels,
    columns,
    rows,
    columnTotals,
    grandTotal,
    truncated: allRows.length > MAX_PIVOT_ROWS,
    measureLabel: String(cols[valueIdx] ?? ''),
  };
};
