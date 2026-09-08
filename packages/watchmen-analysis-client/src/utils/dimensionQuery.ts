import type { MetricDimension } from '@/model/analysis';
import { inferType } from '@/components/bi/utils';

/**
 * Shared group_by construction for metric queries.
 *
 * Only TIME dimensions receive the `__granularity` suffix; categorical
 * dimensions must stay untouched or the backend cannot match them
 * (previously every dimension was rewritten whenever a time dimension and a
 * granularity were selected, breaking mixed time + categorical queries).
 */
export const buildGroupBy = (
  dimensions: string[] | undefined,
  timeGranularity: string | undefined,
  isTimeDimension: (dim: string) => boolean,
): string[] | undefined => {
  if (!dimensions || dimensions.length === 0) return undefined;
  if (!timeGranularity) return [...dimensions];
  return dimensions.map(dim => (isTimeDimension(dim) ? `${dim}__${timeGranularity}` : dim));
};

// Row cap for multi-dimension queries: server-side ordering is by measure
// (desc), so truncation keeps the most significant rows; the client folds
// overflowing series into "Others" per the Top-N setting.
export const MAX_MULTI_DIM_ROWS = 1000;

// Name-based time detection for call sites that only carry dimension names
// (board cards do not keep the full MetricDimension metadata).
export const isTimeDimensionByName = (dim: string): boolean =>
  inferType({ name: dim } as MetricDimension) === 'TIME';

/**
 * Resolve a dimension (base qualified name) to its column index in a
 * MetricFlowResponse. Time dimensions come back suffixed with the applied
 * granularity (e.g. `order_date__month`), so a `name__` prefix also matches.
 */
export const findColumnIndex = (columnNames: Array<string | undefined>, dimension: string): number => {
  const exact = columnNames.indexOf(dimension);
  if (exact >= 0) return exact;
  const prefixed = `${dimension}__`;
  return columnNames.findIndex(name => typeof name === 'string' && name.startsWith(prefixed));
};
