import React from 'react';
import type { ChartDatum, RechartsModule } from './types';
import { COLORS, toNumericValue, extractChartKeys } from './utils';
import { CustomTooltip } from './CustomTooltip';
import type { useChartAxis } from './useChartAxis';

const useChartKeys = (data: ChartDatum[]): string[] => {
  return React.useMemo(() => extractChartKeys(data), [data]);
};

// Shared tooltip props — no animation, no cursor fill to reduce repaint cost
const TOOLTIP_SHARED_PROPS = {
  content: <CustomTooltip />,
  isAnimationActive: false,
  animationDuration: 0,
  cursor: { stroke: 'currentColor', strokeDasharray: '3 3', opacity: 0.3, fill: 'none' },
} as const;

export const KPIView = React.memo(({ data }: { data: ChartDatum[] }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>;
  }

  const currentValue = typeof data[data.length - 1].value === 'number' ? data[data.length - 1].value : 0;
  const previousValue = data.length > 1 ? (typeof data[data.length - 2].value === 'number' ? data[data.length - 2].value : 0) : null;
  
  let change = null;
  let changeType = 'neutral';
  
  if (previousValue !== null && previousValue !== 0) {
    change = ((Number(currentValue) - Number(previousValue)) / Number(previousValue)) * 100;
    changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter tabular-nums bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent drop-shadow-sm">
        {Number(currentValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      {change !== null && (
        <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${
          changeType === 'positive' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 
          changeType === 'negative' ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400' : 
          'text-muted-foreground bg-muted'
        }`}>
          {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
          {Math.abs(change).toFixed(1)}%
          <span className="text-xs opacity-70 ml-1 font-normal">vs previous</span>
        </div>
      )}
    </div>
  );
});

export const BarChartView = React.memo(({ lib, data, chartType, axisProps }: { lib: RechartsModule, data: ChartDatum[], chartType: string, axisProps: ReturnType<typeof useChartAxis> }) => {
  const { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;
  
  const isStacked = chartType === 'stackedBar';
  const isGrouped = chartType === 'groupedBar';
  const isHorizontalLayout = false; // Add support later if needed
  
  // Identify keys for multiple series
  const keys = useChartKeys(data);

  const shouldAnimate = data.length <= 40;

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <BarChart 
        data={data} 
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        layout={isHorizontalLayout ? "vertical" : "horizontal"}
      >
        <CartesianGrid {...commonGridProps} horizontal={!isHorizontalLayout} vertical={isHorizontalLayout} />
        <XAxis {...commonXAxisProps} type={isHorizontalLayout ? "number" : "category"} />
        <YAxis {...commonYAxisProps} type={isHorizontalLayout ? "category" : "number"} dataKey={isHorizontalLayout ? commonXAxisProps.dataKey : undefined} />
        <Tooltip {...TOOLTIP_SHARED_PROPS} />
        {(isGrouped || isStacked) && <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />}
        {keys.map((key, index) => (
          <Bar 
            key={key} 
            dataKey={key} 
            stackId={isStacked ? 'a' : undefined}
            fill={COLORS[index % COLORS.length]} 
            isAnimationActive={shouldAnimate}
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

export const PieChartView = React.memo(({ lib, data }: { lib: RechartsModule, data: ChartDatum[] }) => {
  const { ResponsiveContainer, PieChart, Tooltip, Legend, Pie, Cell } = lib;

  const processedData = React.useMemo(() => {
    if (data.length <= 8) return data;
    
    const sorted = [...data].sort((a, b) => toNumericValue(b.value) - toNumericValue(a.value));
    const top = sorted.slice(0, 7);
    const others = sorted.slice(7);
    
    if (others.length === 0) return top;
    
    const otherValue = others.reduce((sum, item) => sum + toNumericValue(item.value), 0);
    return [
      ...top,
      { name: 'Others', value: otherValue }
    ];
  }, [data]);
  const shouldAnimate = processedData.length <= 16;

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <PieChart>
        <Tooltip {...TOOLTIP_SHARED_PROPS} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Pie 
          data={processedData} 
          dataKey="value" 
          nameKey="name" 
          isAnimationActive={shouldAnimate}
          cx="50%" 
          cy="50%" 
          innerRadius={60} 
          outerRadius={90} 
          paddingAngle={2}
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

export const AreaChartView = React.memo(({ lib, data, axisProps }: { lib: RechartsModule, data: ChartDatum[], axisProps: ReturnType<typeof useChartAxis> }) => {
  const { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;
  
  const keys = useChartKeys(data);

  const hasMultipleSeries = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value');
  const shouldAnimate = data.length <= 80;
  const showActiveDot = data.length <= 120;

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((key, index) => (
            <linearGradient key={key} id={`colorValue-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...commonGridProps} />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip {...TOOLTIP_SHARED_PROPS} />
        {hasMultipleSeries && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />}
        {keys.map((key, index) => (
          <Area 
            key={key}
            type="monotone" 
            dataKey={key} 
            stroke={COLORS[index % COLORS.length]} 
            isAnimationActive={shouldAnimate}
            fillOpacity={1} 
            fill={`url(#colorValue-${index})`} 
            strokeWidth={2}
            activeDot={showActiveDot ? { r: 4, strokeWidth: 0, fill: COLORS[index % COLORS.length] } : false}
            stackId="1" 
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const LineChartView = React.memo(({ lib, data, axisProps }: { lib: RechartsModule, data: ChartDatum[], axisProps: ReturnType<typeof useChartAxis> }) => {
  const { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } = lib;
  const { commonXAxisProps, commonYAxisProps, commonGridProps } = axisProps;

  const keys = useChartKeys(data);

  const hasMultipleSeries = keys.length > 1 || (keys.length === 1 && keys[0] !== 'value');
  const shouldAnimate = data.length <= 80;
  const showActiveDot = data.length <= 120;

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid {...commonGridProps} />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip {...TOOLTIP_SHARED_PROPS} />
        {hasMultipleSeries && <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />}
        {keys.map((key, index) => (
          <Line 
            key={key}
            type="monotone" 
            dataKey={key} 
            stroke={COLORS[index % COLORS.length]} 
            isAnimationActive={shouldAnimate}
            strokeWidth={2.5} 
            dot={false}
            activeDot={showActiveDot ? { r: 6, strokeWidth: 0, fill: COLORS[index % COLORS.length] } : false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});
