import { useTranslation } from 'react-i18next';
import type { SuccessTrendPoint } from '@/model';

export default function TrendChart({ data }: { data: SuccessTrendPoint[] }) {
  const { t } = useTranslation();
  const width = 680;
  const height = 210;
  const left = 38;
  const top = 18;
  const chartHeight = 138;
  const chartWidth = width - left - 18;
  const min = 94;
  const max = 100;
  const x = (index: number) => left + (index / Math.max(data.length - 1, 1)) * chartWidth;
  const y = (rate: number) => top + ((max - rate) / (max - min)) * chartHeight;
  const points = data.map((item, index) => [x(index), y(item.rate)] as const);
  if (points.length === 0) return <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">{t('暂无数据')}</div>;
  const line = points.map(([px, py], index) => `${index === 0 ? 'M' : 'L'} ${px} ${py}`).join(' ');
  const area = `${line} L ${points[points.length - 1][0]} ${top + chartHeight} L ${points[0][0]} ${top + chartHeight} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={t('近七日任务成功率趋势')}>
        <defs><linearGradient id="success-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2492ff" stopOpacity="0.22" /><stop offset="100%" stopColor="#2492ff" stopOpacity="0" /></linearGradient></defs>
        {[94, 96, 98, 100].map((tick) => (
          <g key={tick}><line x1={left} y1={y(tick)} x2={width - 18} y2={y(tick)} stroke="#e8eef5" strokeDasharray="3 4" /><text x={left - 8} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{tick}%</text></g>
        ))}
        <path d={area} fill="url(#success-area)" />
        <path d={line} fill="none" stroke="#1591ed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([px, py], index) => (
          <g key={data[index].day}>
            <circle cx={px} cy={py} r="8" fill="transparent"><title>{data[index].day} · {data[index].rate}% · {t('{{count}} 次运行', { count: data[index].runs })}</title></circle>
            <circle cx={px} cy={py} r={index === points.length - 1 ? 4 : 3} fill="#fff" stroke="#1591ed" strokeWidth="2" />
            <text x={px} y={height - 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{data[index].day}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
