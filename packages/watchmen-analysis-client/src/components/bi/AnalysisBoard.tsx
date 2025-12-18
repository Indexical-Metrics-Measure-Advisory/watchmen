import React from 'react';
import { ChartCard } from '@/components/bi/ChartCard';
import type { BIChartCard, BICardSize, BIChartType } from '@/model/biAnalysis';
import type { AlertStatus } from '@/model/AlertConfig';
import type { MetricFlowResponse } from '@/model/metricFlow';
import type { MetricDimension } from '@/model/analysis';
import { LayoutDashboard, PlusCircle, AlertCircle, BellPlus, SlidersHorizontal, ChevronRight, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';

type ChartDataPoint = unknown;

interface AnalysisBoardProps {
  cards: BIChartCard[];
  cardDataMap: Record<string, { chartData: ChartDataPoint[]; rawData: MetricFlowResponse | null }>;
  onDragStart: (index: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (index: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onResize: (index: number, size: BICardSize) => void;
  onRemove: (index: number) => void;
  onUpdate?: (index: number, card: BIChartCard) => void;
  onAddAlert?: () => void;
  readOnly?: boolean;
  alertStatusMap?: Record<string, AlertStatus>;
  onAcknowledge?: (alertId: string) => void;
  globalFilterDimensions?: MetricDimension[];
  globalFilterValues?: Record<string, string>;
  onGlobalFilterChange?: (dimensionKey: string, value: string) => void;
  onClearGlobalFilters?: () => void;
  globalTimeRange?: string;
  globalCustomDateRange?: DateRange;
  onGlobalTimeRangeChange?: (range: string) => void;
  onGlobalCustomDateRangeChange?: (range: DateRange) => void;
  onRefresh?: () => void;
}

export const AnalysisBoard: React.FC<AnalysisBoardProps> = ({
  cards,
  cardDataMap,
  onDragStart,
  onDragOver,
  onDrop,
  onResize,
  onRemove,
  onUpdate,
  onAddAlert,
  readOnly = false,
  alertStatusMap,
  onAcknowledge,
  globalFilterDimensions,
  globalFilterValues,
  onGlobalFilterChange,
  onClearGlobalFilters,
  globalTimeRange,
  globalCustomDateRange,
  onGlobalTimeRangeChange,
  onGlobalCustomDateRangeChange,
  onRefresh,
}) => {
  const [filtersHidden, setFiltersHidden] = React.useState(true);

  const globalFilterKeys = React.useMemo(() => {
    return (globalFilterDimensions ?? []).map(d => d.qualified_name || d.name);
  }, [globalFilterDimensions]);

  const hasGlobalFilters = globalFilterKeys.length > 0 || Boolean(onGlobalTimeRangeChange);
  const timeRangeValue = globalTimeRange ?? '__card__';

  const decideType = (data: ChartDataPoint[]): BIChartType => {
    if (!data || data.length === 0) return 'bar';

    const firstItem = data[0];
    if (!firstItem || typeof firstItem !== 'object') return 'bar';

    const record = firstItem as Record<string, unknown>;
    const keys = Object.keys(record).filter(k => k !== 'name' && k !== 'date' && k !== 'value' && k !== 'color');
    const hasDate = 'date' in record;
    
    // Time series data
    if (hasDate) {
      // If we have multiple metrics/series over time
      if (keys.length > 0) {
        // If many series, line is cleaner than stacked bar
        return keys.length > 3 ? 'line' : 'stackedBar';
      }
      // Single metric over time -> Area chart looks better for trends
      return 'area';
    }

    // Categorical data with multiple series
    if (keys.length > 0) {
      return keys.length > 4 ? 'stackedBar' : 'groupedBar';
    }

    // Simple categorical data (name + value)
    if (data.length <= 5) {
      // Few items -> Pie chart is acceptable for distribution, but bar is safer. 
      // Let's use Bar for now as it's more precise, or Pie if it looks like a distribution (not implemented logic).
      // Let's stick to Bar but maybe 'pie' if explicitly requested? 
      // For auto-decision, Bar is safe.
      return 'bar'; 
    }

    return 'bar';
  };

  const sizeClass = (size: BICardSize) => {
    switch (size) {
      case 'sm':
        return 'col-span-12 md:col-span-6 lg:col-span-4';
      case 'md':
        return 'col-span-12 md:col-span-8 lg:col-span-6';
      case 'lg':
        return 'col-span-12';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Analysis Dashboard</h2>
            <p className="text-sm text-muted-foreground">Visualize insights and patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gap-2 h-8"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          )}
          {hasGlobalFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersHidden(v => !v)}
              className="gap-2 h-8"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </Button>
          )}
          {!readOnly && onAddAlert && (
            <Button variant="outline" size="sm" onClick={onAddAlert} className="gap-2 h-8">
              <BellPlus className="w-4 h-4" />
              Add Alert
            </Button>
          )}
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            {cards.length} {cards.length === 1 ? 'Visualization' : 'Visualizations'}
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          {cards.length === 0 ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors gap-4">
              <div className="p-4 bg-background rounded-full shadow-sm">
                <PlusCircle className="w-8 h-8 text-primary/40" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-lg text-foreground/80">Your dashboard is empty</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Start by adding a new visualization card from the configuration panel above to analyze your data.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              {cards.map((card, index) => {
                const { chartData, rawData } = cardDataMap[card.id] ?? { chartData: [], rawData: null };

                if ((!card.selection.dimensions || card.selection.dimensions.length === 0) && card.chartType !== 'alert' && card.chartType !== 'kpi') {
                  return (
                    <div key={card.id} className={cn("transition-all duration-200", sizeClass(card.size))}>
                      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground border border-border/50 rounded-xl bg-card/30 p-8 text-center shadow-sm gap-3">
                        <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground/80">Missing Configuration</p>
                          <p className="text-sm">Select dimensions and metrics to generate visualization</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                const renderCard = {
                  ...card,
                  chartType: (card.chartType === 'alert' || card.chartType === 'kpi') ? card.chartType : decideType(chartData)
                };

                return (
                  <ChartCard
                    key={card.id}
                    card={renderCard}
                    data={chartData}
                    sourceData={rawData ?? undefined}
                    draggable={!readOnly}
                    onDragStart={!readOnly ? onDragStart(index) : undefined}
                    onDragOver={!readOnly ? onDragOver : undefined}
                    onDrop={!readOnly ? onDrop(index) : undefined}
                    onResize={!readOnly ? (size) => onResize(index, size) : undefined}
                    onRemove={!readOnly ? () => onRemove(index) : undefined}
                    onUpdate={!readOnly ? (updatedCard) => onUpdate?.(index, updatedCard) : undefined}
                    alertStatus={alertStatusMap?.[card.id]}
                    onAcknowledge={onAcknowledge}
                  />
                );
              })}
            </div>
          )}
        </div>

        {hasGlobalFilters && !filtersHidden && (
          <Card className="w-[320px] shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Global Filters</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setFiltersHidden(true)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Time Range</Label>
                <Select value={timeRangeValue} onValueChange={v => onGlobalTimeRangeChange?.(v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__card__">Per card</SelectItem>
                    <SelectItem value="Past 7 days">Past 7 days</SelectItem>
                    <SelectItem value="Past 30 days">Past 30 days</SelectItem>
                    <SelectItem value="Past 90 days">Past 90 days</SelectItem>
                    <SelectItem value="Past year">Past year</SelectItem>
                    <SelectItem value="Custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {timeRangeValue === 'Custom' && (
                  <div className="pt-1">
                    <DatePickerWithRange
                      date={globalCustomDateRange}
                      onSelect={onGlobalCustomDateRangeChange ?? (() => undefined)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {globalFilterKeys.map(key => {
                const d = (globalFilterDimensions ?? []).find(x => (x.qualified_name || x.name) === key);
                const label = d?.name || key;
                const desc = d?.description;
                const value = globalFilterValues?.[key] ?? '';
                return (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs" title={desc || label}>{label}</Label>
                    <Input
                      value={value}
                      onChange={e => onGlobalFilterChange?.(key, e.target.value)}
                      placeholder="Filter value"
                      className="h-8"
                    />
                  </div>
                );
              })}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onClearGlobalFilters?.()}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {hasGlobalFilters && filtersHidden && (
          <div className="w-[32px] shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-8 p-0"
              onClick={() => setFiltersHidden(false)}
              title="Show filters"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisBoard;
