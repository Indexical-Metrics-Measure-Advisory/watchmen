import { describe, expect, it } from 'vitest';
import { resolveDimensionRoles, VALUE_BUCKET_DIMENSION } from '@/components/bi/dimensionRoles';

describe('resolveDimensionRoles value buckets', () => {
  it('uses the bucket as the axis when no ordinary dimension is selected', () => {
    expect(resolveDimensionRoles({ dimensions: [], valueBucketId: 'bucket-1' })).toEqual({
      axisDimension: VALUE_BUCKET_DIMENSION,
      seriesDimension: undefined,
      facetDimension: undefined,
      detailDimensions: []
    });
  });

  it('uses the bucket as the series after an ordinary axis', () => {
    expect(resolveDimensionRoles(
      { dimensions: ['region'], valueBucketId: 'bucket-1' },
      () => false
    )).toEqual({
      axisDimension: 'region',
      seriesDimension: VALUE_BUCKET_DIMENSION,
      facetDimension: undefined,
      detailDimensions: []
    });
  });

  it('honours an explicit bucket facet without adding it to dimensions', () => {
    const selection = {
      dimensions: ['region'],
      valueBucketId: 'bucket-1',
      facetDimension: VALUE_BUCKET_DIMENSION
    };
    expect(resolveDimensionRoles(selection, () => false)).toEqual({
      axisDimension: 'region',
      seriesDimension: undefined,
      facetDimension: VALUE_BUCKET_DIMENSION,
      detailDimensions: []
    });
    expect(selection.dimensions).toEqual(['region']);
  });
});
