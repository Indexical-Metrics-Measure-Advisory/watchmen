import { MetricDimension } from '@/model/analysis';

export type DimUIType = 'CATEGORICAL' | 'TIME';

export const inferType = (d: MetricDimension): DimUIType => {
  const raw = (d.dimensionType ?? '').toString().toUpperCase();
  if (raw === 'TIME') return 'TIME';
  const s = `${d.description ?? ''} ${d.qualified_name ?? ''} ${d.name ?? ''}`.toLowerCase();
  const timeHints = [
    'date', 'time', 'month', 'year', 'quarter', 'week', 'day', 'hour', 'period', 'window', 'timestamp', 'datetime',
    'created_at', 'updated_at'
  ];
  if (timeHints.some(h => s.includes(h))) return 'TIME';
  return 'CATEGORICAL';
};
