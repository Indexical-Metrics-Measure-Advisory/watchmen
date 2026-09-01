import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChartDatum, RechartsModule } from './types';
import { COLORS, toNumericValue, extractChartKeys } from './utils';
import { CustomTooltip } from './CustomTooltip';
import type { useChartAxis } from './useChartAxis';
import { formatMetricValue } from '@/utils/metricValueFormat';

const useChartKeys = (data: ChartDatum[]): string[] => {
  return React.useMemo(() => extractChartKeys(data), [data]);
};

// Shared empty state for all chart views — mirrors the "loading visualization" placeholder in ChartCard
export const ChartEmptyState = () => {
  const { t } = useTranslation('biAnalysis');
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2">
      <BarChart2 className="w-8 h-8 opacity-20" />
      <span className="text-xs font-medium">{t('chart.noData')}</span>
      <span className="text-xs opacity-70">{t('chart.noDataHint')}</span>
    </div>
  );
};

// KPI change pill label by time granularity
const COMPARISON_LABEL_KEYS: Record<string, string> = {
  day: 'chart.vsYesterday',
  week: 'chart.vsLastWeek',
  month: 'chart.vsLastMonth',
  quarter: 'chart.vsLastQuarter',
  year: 'chart.vsLastYear',
};

// Shared legend style — round markers to match the tooltip color dots and the
// overall rounded visual language of the app
const legendProps = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: '12px', color: 'hsl(var(--muted-foreground))', paddingTop: '10px' },
};

// Shared tooltip props — no animation, no cursor fill to reduce repaint cost.
// format is the display format configured on the metric (number / currency / percentage),
// unit is the display unit configured on the metric, appended after the value.
// currency is inferred from the metric unit; valueLabel replaces the raw "value"
// series name; total (pie only) appends the slice's share of the total.
const tooltipSharedProps = (format?: string, unit?: string, currency?: string, valueLabel?: string, total?: number) => ({
  content: <CustomTooltip format={format} unit={unit} currency={currency} valueLabel={valueLabel} total={total} />,
  isAnimationActive: false,
  animationDuration: 0,
  cursor: { stroke: 'currentColor', strokeDasharray: '3 3', opacity: 0.3, fill: 'none' as const },
});

// Y-axis tick formatter: metric format wins; the default K/M abbreviation otherwise
const yAxisTickFormatter = (
  format: string | undefined,
  fallback: ReturnType<typeof useChartAxis>['formatYAxis'],
  currency?: string,
) => (format ? (value: number) => formatMetricValue(value, format, currency) : fallback);

// Hover dot with a card-colored ring so it pops off the line/area
const activeDotWithRing = (color: string) => ({ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))', fill: color });

export const KPIView = React.memo(({ data, format, unit, currency, granularity }: { data: ChartDatum[]; format?: string; unit?: string; currency?: string; granularity?: string }) => {
  const { t } = useTranslation('biAnalysis');

  if (!data || data.length === 0) {
    return <ChartEmptyState />;
  }

  const currentValue = typeof data[data.length - 1].value === 'number' ? data[data.length - 1].value : 0;
  const previousValue = data.length > 1 ? (typeof data[data.length - 2].value === 'number' ? data[data.length - 2].value : 0) : null;

  let change = null;
  let changeType = 'neutral';

  if (previousValue !== null && previousValue !== 0) {
    change = ((Number(currentValue) - Number(previousValue)) / Number(previousValue)) * 100;
    changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  }

  const delta = previousValue !== null ? Number(currentValue) - Number(previousValue) : null;
  const comparisonLabel = t(COMPARISON_LABEL_KEYS[granularity ?? ''] ?? 'chart.vsPreviousPeriod');

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter tabular-nums bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent drop-shadow-sm">
          {formatMetricValue(Number(currentValue), format, currency)}
        </span>
        {unit && <span className="text-lg sm:text-xl font-medium text-muted-foreground whitespace-nowrap">{unit}</span>}
      </div>
      {change !== null && (
        <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${
          changeType === 'positive' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 
          changeType === 'negative' ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400' : 
          'text-muted-foreground bg-muted'
        }`}>
          {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
          {Math.abs(change).toFixed(1)}%
          {delta !== null && delta !== 0 && (
            <span className="tabular-nums">
              ({delta > 0 ? '+' : '-'}{formatMetricValue(Math.abs(delta), format, currency)})
            </span>
          )}
          <span className="text-xs opacity-70 ml-1 font-normal">{comparisonLabel}</span>
        </div>
      )}
    </div>
  );
});

export const BarChartView = React.memo(({ lib, data, chartType, axisProps, format, unit, currency, valueLabel }: { lib: RechartsModule, data: ChartDatum[], chartType: string, axisProps: ReturnType<typeof useChartAxis>, format?: string, unit?: string, currency?: string, valueLabel?: string }) => {
  const { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;
  
  const isStacked = chartType === 'stackedBar';
  const isGrouped = chartType === 'groupedBar';
  const isHorizontalLayout = false; // Add support later if needed
  
  // Identify keys for multiple series
  const keys = useChartKeys(data);

  const shouldAnimate = data.length <= 40;

  if (data.length === 0) {
    return <ChartEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={300}>
      <BarChart 
        data={data} 
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        layout={isHorizontalLayout ? "vertical" : "horizontal"}
        barCategoryGap="25%"
        barGap={4}
      >
        <defs>
          {keys.map((key, index) => (
            <linearGradient key={key} id={`barFill-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
              <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.65}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...commonGridProps} horizontal={!isHorizontalLayout} vertical={isHorizontalLayout} />
        <XAxis {...commonXAxisProps} type={isHorizontalLayout ? "number" : "category"} />
        <YAxis
          {...commonYAxisProps}
          tickFormatter={yAxisTickFormatter(format, axisProps.formatYAxis, currency)}
          type={isHorizontalLayout ? "category" : "number"}
          dataKey={isHorizontalLayout ? commonXAxisProps.dataKey : undefined}
        />
        <Tooltip {...tooltipSharedProps(format, unit, currency, valueLabel)} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
        {(isGrouped || isStacked) && <Legend {...legendProps} />}
        {keys.map((key, index) => (
          <Bar 
            key={key} 
            dataKey={key}
            name={key === 'value' && valueLabel ? valueLabel : key}
            stackId={isStacked ? 'a' : undefined}
            fill={`url(#barFill-${index})`}
            isAnimationActive={shouldAnimate}
            animationDuration={600}
            animationEasing="ease-out"
            radius={
              isHorizontalLayout 
                ? (isStacked ? [0, 0, 0, 0] : [0, 4, 4, 0]) 
                : (isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]) 
            }
            maxBarSize={60}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
});

export const PieChartView = React.memo(({ lib, data, format, unit, currency, valueLabel }: { lib: RechartsModule, data: ChartDatum[], format?: string, unit?: string, currency?: string, valueLabel?: string }) => {
  const { ResponsiveContainer, PieChart, Tooltip, Legend, Pie, Cell } = lib;
  const { t } = useTranslation('biAnalysis');

  const processedData = React.useMemo(() => {
    if (data.length <= 8) return data;
    
    const sorted = [...data].sort((a, b) => toNumericValue(b.value) - toNumericValue(a.value));
    const top = sorted.slice(0, 7);
    const others = sorted.slice(7);
    
    if (others.length === 0) return top;
    
    const otherValue = others.reduce((sum, item) => sum + toNumericValue(item.value), 0);
    return [
      ...top,
      { name: t('chart.others'), value: otherValue }
    ];
  }, [data, t]);

  // Total of the processed slices — lets the tooltip show each slice's share
  const pieTotal = React.useMemo(
    () => processedData.reduce((sum, item) => sum + toNumericValue(item.value), 0),
    [processedData]
  );

  const shouldAnimate = processedData.length <= 16;

  if (data.length === 0) {
    return <ChartEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={300}>
      <PieChart>
        <Tooltip {...tooltipSharedProps(format, unit, currency, valueLabel, pieTotal)} />
        <Legend {...legendProps} />
        <Pie 
          data={processedData} 
          dataKey="value" 
          nameKey="name" 
          isAnimationActive={shouldAnimate}
          animationDuration={600}
          animationEasing="ease-out"
          cx="50%" 
          cy="50%" 
          innerRadius={60} 
          outerRadius={90} 
          paddingAngle={2}
          cornerRadius={4}
          strokeWidth={2}
          stroke="hsl(var(--card))"
        >
          {processedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
});

export const AreaChartView = React.memo(({ lib, data, axisProps, format, unit, currency, valueLabel }: { lib: RechartsModule, data: ChartDatum[], axisProps: ReturnType<typeof useChartAxis>, format?: string, unit?: string, currency?: string, valueLabel?: string }) => {
  const { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;
  
  const keys = useChartKeys(data);

  const hasMultipleSeries = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value');
  const shouldAnimate = data.length <= 80;
  const showActiveDot = data.length <= 120;

  if (data.length === 0) {
    return <ChartEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((key, index) => (
            <linearGradient key={key} id={`colorValue-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.02}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...commonGridProps} />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} tickFormatter={yAxisTickFormatter(format, axisProps.formatYAxis, currency)} />
        <Tooltip {...tooltipSharedProps(format, unit, currency, valueLabel)} />
        {hasMultipleSeries && <Legend {...legendProps} />}
        {keys.map((key, index) => (
          <Area
            key={key}
            type="monotone" 
            dataKey={key}
            name={key === 'value' && valueLabel ? valueLabel : key}
            stroke={COLORS[index % COLORS.length]} 
            isAnimationActive={shouldAnimate}
            animationDuration={600}
            animationEasing="ease-out"
            fillOpacity={1} 
            fill={`url(#colorValue-${index})`} 
            strokeWidth={2}
            activeDot={showActiveDot ? activeDotWithRing(COLORS[index % COLORS.length]) : false}
            stackId="1" 
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const LineChartView = React.memo(({ lib, data, axisProps, format, unit, currency, valueLabel }: { lib: RechartsModule, data: ChartDatum[], axisProps: ReturnType<typeof useChartAxis>, format?: string, unit?: string, currency?: string, valueLabel?: string }) => {
  const { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;

  const keys = useChartKeys(data);

  const hasMultipleSeries = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value');
  const shouldAnimate = data.length <= 80;
  const showActiveDot = data.length <= 120;

  if (data.length === 0) {
    return <ChartEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid {...commonGridProps} />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} tickFormatter={yAxisTickFormatter(format, axisProps.formatYAxis, currency)} />
        <Tooltip {...tooltipSharedProps(format, unit, currency, valueLabel)} />
        {hasMultipleSeries && <Legend {...legendProps} />}
        {keys.map((key, index) => (
          <Line
            key={key}
            type="monotone" 
            dataKey={key}
            name={key === 'value' && valueLabel ? valueLabel : key}
            stroke={COLORS[index % COLORS.length]} 
            isAnimationActive={shouldAnimate}
            animationDuration={600}
            animationEasing="ease-out"
            strokeWidth={2.5} 
            dot={false}
            activeDot={showActiveDot ? activeDotWithRing(COLORS[index % COLORS.length]) : false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});
