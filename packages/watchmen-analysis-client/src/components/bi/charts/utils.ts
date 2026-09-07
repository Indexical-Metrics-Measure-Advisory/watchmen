import type { ChartDatum, ChartDatumValue } from './types';

export const MAX_TIME_SERIES_POINTS = 240;
export const MAX_CATEGORY_POINTS = 120;
export const TOOLTIP_CURSOR = { fill: 'currentColor', opacity: 0.05 };

// Theme-aware chart palette: resolves against the --chart-* tokens defined in
// index.css, so charts follow light/dark mode automatically.
export const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
];

export const toNumericValue = (value: ChartDatumValue): number => typeof value === 'number' ? value : 0;

export const sampleDataByIndex = (data: ChartDatum[], maxPoints: number): ChartDatum[] => {
  if (data.length <= maxPoints) return data;
  const step = (data.length - 1) / (maxPoints - 1);
  const sampled: ChartDatum[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(data[Math.round(i * step)]);
  }
  return sampled;
};

/**
 * Extract numeric series keys from chart data (excluding name/date/value/fill/color).
 * Shared by BarChartView, AreaChartView, and LineChartView.
 */
export const extractChartKeys = (data: ChartDatum[]): string[] => {
  if (!data || data.length === 0) return ['value'];
  const extractedKeys = Object.keys(data[0]).filter(k =>
    k !== 'name' && k !== 'date' && k !== 'value' && k !== 'fill' && k !== 'color' &&
    (typeof data[0][k] === 'number' || data[0][k] === null)
  );
  return extractedKeys.length > 0 ? extractedKeys : ['value'];
};

/**
 * Cap multi-series chart data to the top series by total value, folding the
 * rest into a single "others" series (always last). Keeps charts readable and
 * guarantees the series count never exceeds the palette size.
 */
export const capSeries = (
  data: ChartDatum[],
  keys: string[],
  othersLabel: string,
  maxSeries: number = 8,
): { data: ChartDatum[]; keys: string[] } => {
  if (keys.length <= maxSeries) return { data, keys };

  const totals = new Map<string, number>(keys.map(k => [k, 0]));
  data.forEach(row => {
    keys.forEach(k => totals.set(k, (totals.get(k) ?? 0) + toNumericValue(row[k])));
  });
  const sorted = [...keys].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  const kept = sorted.slice(0, maxSeries - 1);
  const dropped = sorted.slice(maxSeries - 1);

  const capped = data.map(row => {
    const next: ChartDatum = {};
    Object.entries(row).forEach(([k, v]) => {
      if (!dropped.includes(k)) next[k] = v;
    });
    next[othersLabel] = dropped.reduce((sum, k) => sum + toNumericValue(row[k]), 0);
    return next;
  });

  return { data: capped, keys: [...kept, othersLabel] };
};

/**
 * Keep the top categories of single-dimension {name, value} data and fold the
 * rest into an "others" bucket (mirrors the pie chart behaviour).
 */
export const topNWithOthers = (data: ChartDatum[], othersLabel: string, max: number = 10): ChartDatum[] => {
  if (data.length <= max) return data;
  const sorted = [...data].sort((a, b) => toNumericValue(b.value) - toNumericValue(a.value));
  const top = sorted.slice(0, max - 1);
  const restValue = sorted.slice(max - 1).reduce((sum, item) => sum + toNumericValue(item.value), 0);
  return [...top, { name: othersLabel, value: restValue }];
};
