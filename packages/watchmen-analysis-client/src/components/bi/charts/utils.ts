import type { ChartDatum, ChartDatumValue } from './types';

export const MAX_TIME_SERIES_POINTS = 240;
export const MAX_CATEGORY_POINTS = 120;
export const TOOLTIP_CURSOR = { fill: 'currentColor', opacity: 0.05 };

// Modern color palette
export const COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#6366f1', // Indigo
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
