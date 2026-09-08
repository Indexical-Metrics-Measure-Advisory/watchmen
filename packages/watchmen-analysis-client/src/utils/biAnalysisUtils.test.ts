import { describe, it, expect } from 'vitest';
import { transformMetricFlowToChart } from '@/utils/biAnalysisUtils';
import { isTimeDimensionByName } from '@/utils/dimensionQuery';
import type { MetricFlowResponse } from '@/model/metricFlow';

const resp = (columnNames: string[], data: unknown[][]): MetricFlowResponse =>
  ({ column_names: columnNames, data } as unknown as MetricFlowResponse);

describe('transformMetricFlowToChart', () => {
  it('aggregates a single time dimension into sorted {date, value} rows', () => {
    const dataset = transformMetricFlowToChart(resp(
      ['order_date', 'value'],
      [
        ['2024-01-02', 5],
        ['2024-01-01', 3],
        ['2024-01-01', 2],
      ],
    ));
    expect(dataset.axisIsTime).toBe(true);
    expect(dataset.facets).toBeNull();
    expect(dataset.rows).toEqual([
      { date: '2024-01-01', value: 5 },
      { date: '2024-01-02', value: 5 },
    ]);
  });

  it('aggregates a single categorical dimension into ranked {name, value} rows', () => {
    const dataset = transformMetricFlowToChart(resp(
      ['region', 'value'],
      [
        ['North', 4],
        ['South', 1],
        ['North', 6],
      ],
    ));
    expect(dataset.rows).toEqual([
      { name: 'North', value: 10 },
      { name: 'South', value: 1 },
    ]);
  });

  it('pivots axis × series with real series keys (no composite concatenation)', () => {
    const dataset = transformMetricFlowToChart(resp(
      ['region', 'channel', 'value'],
      [
        ['North', 'Web', 4],
        ['North', 'Store', 6],
        ['South', 'Web', 1],
      ],
    ));
    expect(dataset.rows).toEqual([
      { name: 'North', Web: 4, Store: 6 },
      { name: 'South', Web: 1 },
    ]);
  });

  it('uses the time column as the axis when mixed with a categorical dimension', () => {
    const dataset = transformMetricFlowToChart(resp(
      ['region', 'order_date__month', 'value'],
      [
        ['North', '2024-01', 1],
        ['South', '2024-01', 2],
        ['North', '2024-02', 3],
      ],
    ));
    expect(dataset.axisIsTime).toBe(true);
    expect(dataset.rows).toEqual([
      { date: '2024-01', North: 1, South: 2 },
      { date: '2024-02', North: 3 },
    ]);
  });

  it('honours explicit role assignments over inference', () => {
    const dataset = transformMetricFlowToChart(resp(
      ['region', 'channel', 'value'],
      [
        ['North', 'Web', 2],
        ['South', 'Web', 1],
        ['North', 'Store', 3],
        ['South', 'Store', 4],
      ],
    ), { seriesDimension: 'region', axisDimension: 'channel' });
    // channel becomes the axis, region the series
    expect(dataset.rows).toEqual([
      { name: 'Store', North: 3, South: 4 },
      { name: 'Web', North: 2, South: 1 },
    ]);
  });

  it('splits data into facet groups ordered by facet total', () => {
    // dims: date (axis) × region (series) × channel (facet)
    const dataset = transformMetricFlowToChart(resp(
      ['order_date', 'region', 'channel', 'value'],
      [
        ['2024-01', 'North', 'Web', 1],
        ['2024-01', 'South', 'Web', 2],
        ['2024-01', 'North', 'Store', 10],
        ['2024-01', 'South', 'Store', 5],
      ],
    ), { facetDimension: 'channel', isTimeDimension: isTimeDimensionByName });
    expect(dataset.facets).not.toBeNull();
    expect(dataset.facets!.map(f => f.value)).toEqual(['Store', 'Web']);
    expect(dataset.facets![0].rows).toEqual([
      { date: '2024-01', North: 10, South: 5 },
    ]);
    expect(dataset.facets![1].rows).toEqual([
      { date: '2024-01', North: 1, South: 2 },
    ]);
  });

  it('sums to a single KPI row without dimensions', () => {
    const dataset = transformMetricFlowToChart(resp(['value'], [[2], [3]]));
    expect(dataset.rows).toEqual([{ value: 5 }]);
  });

  it('returns empty rows for malformed payloads', () => {
    expect(transformMetricFlowToChart(null as unknown as MetricFlowResponse).rows).toEqual([]);
    expect(transformMetricFlowToChart({} as MetricFlowResponse).rows).toEqual([]);
  });
});
