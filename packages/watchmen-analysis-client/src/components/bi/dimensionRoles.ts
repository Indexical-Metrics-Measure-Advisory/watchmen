import type { BIDimensionSelection } from '@/model/biAnalysis';
import type { BIChartType } from '@/model/biAnalysis';
import { inferType } from './utils';

/**
 * Dimension role resolution for multi-dimension charts.
 *
 * A chart can only give a visual channel (axis / series / facet) to a handful
 * of dimensions; the remaining "detail" dimensions stay in the query and are
 * shown in full by the pivot/data view instead of hiding the chart.
 */

export type DimensionRole = 'axis' | 'series' | 'facet' | 'detail';

export interface ResolvedDimensionRoles {
  axisDimension?: string;
  seriesDimension?: string;
  facetDimension?: string;
  detailDimensions: string[];
}

export const isDimensionRole = (value: string): value is DimensionRole =>
  value === 'axis' || value === 'series' || value === 'facet' || value === 'detail';

// Per-chart-type dimension capacity (visual channels each chart can express).
// Dimensions beyond this capacity render only in the pivot/data view.
export const CHART_DIMENSION_CAPACITY: Record<string, number> = {
  kpi: 0,
  pie: 1,
  line: 3,
  area: 3,
  bar: 3,
  groupedBar: 3,
  stackedBar: 3,
  table: Infinity,
  pivot: Infinity,
  alert: 0,
};

export const chartDimensionCapacity = (chartType: BIChartType): number =>
  CHART_DIMENSION_CAPACITY[chartType] ?? 3;

const isTimeDimensionName = (dim: string): boolean =>
  inferType({ name: dim } as Parameters<typeof inferType>[0]) === 'TIME';

/**
 * Resolve which dimension plays which visual role.
 *
 * Explicit roles from the selection win; unset roles fall back to inference:
 * axis prefers the first TIME dimension, then the first remaining dimension;
 * series takes the next remaining dimension; facet is only used when set
 * explicitly (small multiples change the layout too much to infer silently).
 */
export const resolveDimensionRoles = (
  selection: Pick<BIDimensionSelection, 'dimensions' | 'axisDimension' | 'seriesDimension' | 'facetDimension'>,
  isTimeDimension: (dim: string) => boolean = isTimeDimensionName,
): ResolvedDimensionRoles => {
  const dimensions = (selection.dimensions ?? []).filter(Boolean);
  const available = new Set(dimensions);
  // Explicit roles are only honoured when the dimension is actually selected
  const explicitAxis = selection.axisDimension && available.has(selection.axisDimension)
    ? selection.axisDimension
    : undefined;
  const explicitSeries = selection.seriesDimension && available.has(selection.seriesDimension)
    ? selection.seriesDimension
    : undefined;
  const explicitFacet = selection.facetDimension && available.has(selection.facetDimension)
    ? selection.facetDimension
    : undefined;

  const taken = new Set<string>();
  if (explicitAxis) taken.add(explicitAxis);
  if (explicitSeries) taken.add(explicitSeries);
  if (explicitFacet) taken.add(explicitFacet);
  const remaining = dimensions.filter(dim => !taken.has(dim));

  let axis = explicitAxis;
  if (!axis) {
    axis = remaining.find(dim => isTimeDimension(dim));
    if (axis) remaining.splice(remaining.indexOf(axis), 1);
  }
  if (!axis && remaining.length > 0) {
    axis = remaining.shift();
  }

  let series = explicitSeries;
  if (!series && remaining.length > 0) {
    series = remaining.shift();
  }

  return {
    axisDimension: axis,
    seriesDimension: series,
    facetDimension: explicitFacet,
    detailDimensions: remaining,
  };
};

/** Assign one role to a dimension; a role is unique so it is moved off any other dimension. */
export const applyDimensionRole = (
  roles: Pick<BIDimensionSelection, 'axisDimension' | 'seriesDimension' | 'facetDimension'>,
  dimension: string,
  role: DimensionRole,
): Pick<BIDimensionSelection, 'axisDimension' | 'seriesDimension' | 'facetDimension'> => {
  // Only the three role keys may be returned: callers spread the result over
  // the full selection state, so leaking other fields (e.g. a stale
  // `dimensions` array when given the whole config object) would silently
  // overwrite fresh state.
  const next: Pick<BIDimensionSelection, 'axisDimension' | 'seriesDimension' | 'facetDimension'> = {
    axisDimension: roles.axisDimension,
    seriesDimension: roles.seriesDimension,
    facetDimension: roles.facetDimension,
  };
  if (next.axisDimension === dimension && role !== 'axis') next.axisDimension = undefined;
  if (next.seriesDimension === dimension && role !== 'series') next.seriesDimension = undefined;
  if (next.facetDimension === dimension && role !== 'facet') next.facetDimension = undefined;
  if (role === 'axis') {
    next.axisDimension = dimension;
    if (next.seriesDimension === dimension) next.seriesDimension = undefined;
    if (next.facetDimension === dimension) next.facetDimension = undefined;
  } else if (role === 'series') {
    if (next.axisDimension === dimension) next.axisDimension = undefined;
    next.seriesDimension = dimension;
    if (next.facetDimension === dimension) next.facetDimension = undefined;
  } else if (role === 'facet') {
    if (next.axisDimension === dimension) next.axisDimension = undefined;
    if (next.seriesDimension === dimension) next.seriesDimension = undefined;
    next.facetDimension = dimension;
  } else {
    if (next.axisDimension === dimension) next.axisDimension = undefined;
    if (next.seriesDimension === dimension) next.seriesDimension = undefined;
    if (next.facetDimension === dimension) next.facetDimension = undefined;
  }
  return next;
};
