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
