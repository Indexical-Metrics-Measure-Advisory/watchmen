import { describe, it, expect } from 'vitest';
import { buildGroupBy, isTimeDimensionByName, findColumnIndex, MAX_MULTI_DIM_ROWS } from '@/utils/dimensionQuery';

describe('buildGroupBy', () => {
  it('returns undefined for empty/missing dimensions', () => {
    expect(buildGroupBy(undefined, 'day', () => true)).toBeUndefined();
    expect(buildGroupBy([], 'day', () => true)).toBeUndefined();
  });

  it('appends the granularity suffix only to TIME dimensions', () => {
    const isTime = (dim: string) => dim === 'order_date';
    expect(buildGroupBy(['order_date', 'region'], 'month', isTime)).toEqual([
      'order_date__month',
      'region',
    ]);
  });

  it('keeps all dimensions untouched without a granularity', () => {
    expect(buildGroupBy(['order_date', 'region'], undefined, () => true)).toEqual([
      'order_date',
      'region',
    ]);
  });

  it('does not rewrite categorical dimensions when a time dimension is selected (regression)', () => {
    // Previously every dimension was suffixed, breaking mixed queries
    const isTime = (dim: string) => dim === 'created_at';
    expect(buildGroupBy(['created_at', 'product', 'city'], 'day', isTime)).toEqual([
      'created_at__day',
      'product',
      'city',
    ]);
  });
});

describe('isTimeDimensionByName', () => {
  it('detects time-ish names', () => {
    expect(isTimeDimensionByName('order_date')).toBe(true);
    expect(isTimeDimensionByName('created_at')).toBe(true);
    expect(isTimeDimensionByName('region')).toBe(false);
  });
});

describe('findColumnIndex', () => {
  const cols = ['metric_value', 'order_date__month', 'region'];

  it('matches exact column names', () => {
    expect(findColumnIndex(cols, 'region')).toBe(2);
  });

  it('matches granularity-suffixed time columns by prefix', () => {
    expect(findColumnIndex(cols, 'order_date')).toBe(1);
  });

  it('returns -1 for unknown dimensions', () => {
    expect(findColumnIndex(cols, 'product')).toBe(-1);
  });

  it('row cap constant is sane', () => {
    expect(MAX_MULTI_DIM_ROWS).toBeGreaterThanOrEqual(500);
  });
});
