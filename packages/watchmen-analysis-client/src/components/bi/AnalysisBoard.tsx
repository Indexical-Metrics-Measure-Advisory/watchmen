import React from 'react';
import { ChartCard } from '@/components/bi/ChartCard';
import type { BIChartCard, BICardSize } from '@/model/biAnalysis';
import type { AlertStatus } from '@/model/AlertConfig';
import type { MetricFlowResponse } from '@/model/metricFlow';
import type { MetricDimension } from '@/model/analysis';
import type { ChartDatum } from '@/components/bi/ChartCard';
import { LayoutDashboard, PlusCircle, AlertCircle, BellPlus, SlidersHorizontal, ChevronRight, X, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { RechartsProvider } from './charts/RechartsContext';

type ChartDataPoint = ChartDatum;
const INITIAL_VISIBLE_CARDS = 12;
const CARD_RENDER_BATCH_SIZE = 12;

// ── Stable empty default to avoid new []/null references on each render ──
const EMPTY_CARD_DATA: { chartData: ChartDataPoint[]; rawData: MetricFlowResponse | null } = {
  chartData: [],
  rawData: null,
};

interface AnalysisBoardProps {
  cards: BIChartCard[];
  cardDataMap: Record<string, { chartData: ChartDataPoint[]; rawData: MetricFlowResponse | null }>;
  onDragStart: (index: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (index: number) => (e: React.DragEvent<HTMLDivElement>) => void;
  onResize: (index: number, size: BICardSize) => void;
  onRemove: (index: number) => void;
  onAddAlert?: () => void;
  onSubscription?: () => void;
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
  isRefreshing?: boolean;
}

interface BoardCardItemProps {
  card: BIChartCard;
  index: number;
  chartData: ChartDataPoint[];
  rawData: MetricFlowResponse | null;
  readOnly: boolean;
  alertStatus?: AlertStatus;
  onDragStart: AnalysisBoardProps['onDragStart'];
  onDragOver: AnalysisBoardProps['onDragOver'];
  onDrop: AnalysisBoardProps['onDrop'];
  onResize: AnalysisBoardProps['onResize'];
  onRemove: AnalysisBoardProps['onRemove'];
  onAcknowledge?: AnalysisBoardProps['onAcknowledge'];
}

const getCardSizeClass = (size: BICardSize) => {
  switch (size) {
    case 'sm':
      return 'col-span-12 md:col-span-6 lg:col-span-4';
    case 'md':
      return 'col-span-12 md:col-span-8 lg:col-span-6';
    case 'lg':
      return 'col-span-12';
  }
};

const BoardCardItem = React.memo(({
  card,
  index,
  chartData,
  rawData,
  readOnly,
  alertStatus,
  onDragStart,
  onDragOver,
  onDrop,
  onResize,
  onRemove,
  onAcknowledge
}: BoardCardItemProps) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const ref = React.useRef<HTMLDivElement>(null);

  // IntersectionObserver: unload chart content when off-screen
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stable callbacks: avoid creating new arrow functions on each render
  const handleDragStart = React.useMemo(
    () => !readOnly ? onDragStart(index) : undefined,
    [readOnly, onDragStart, index]
  );
  const handleDrop = React.useMemo(
    () => !readOnly ? onDrop(index) : undefined,
    [readOnly, onDrop, index]
  );
  const handleResize = React.useMemo(
    () => !readOnly ? (size: BICardSize) => onResize(index, size) : undefined,
    [readOnly, onResize, index]
  );
  const handleRemove = React.useMemo(
    () => !readOnly ? () => onRemove(index) : undefined,
    [readOnly, onRemove, index]
  );

  if ((!card.selection.dimensions || card.selection.dimensions.length === 0) && card.chartType !== 'alert' && card.chartType !== 'kpi') {
    return (
      <div ref={ref} className={cn('transition-shadow duration-200', getCardSizeClass(card.size))} style={{ contain: 'layout style paint' }}>
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

  return (
    <div
      ref={ref}
      className={cn(getCardSizeClass(card.size))}
      style={{ contain: 'layout style paint' }}
    >
      {isVisible ? (
        <ChartCard
          card={card}
          data={chartData}
          sourceData={rawData ?? undefined}
          draggable={!readOnly}
          onDragStart={handleDragStart}
          onDragOver={!readOnly ? onDragOver : undefined}
          onDrop={handleDrop}
          onResize={handleResize}
          onRemove={handleRemove}
          alertStatus={alertStatus}
          onAcknowledge={onAcknowledge}
        />
      ) : (
        <div className="h-full min-h-[300px] border border-border/30 rounded-xl bg-muted/10" />
      )}
    </div>
  );
}, (prev, next) => (
  prev.card === next.card &&
  prev.index === next.index &&
  prev.chartData === next.chartData &&
  prev.rawData === next.rawData &&
  prev.readOnly === next.readOnly &&
  prev.alertStatus === next.alertStatus &&
  prev.onDragStart === next.onDragStart &&
  prev.onDragOver === next.onDragOver &&
  prev.onDrop === next.onDrop &&
  prev.onResize === next.onResize &&
  prev.onRemove === next.onRemove &&
  prev.onAcknowledge === next.onAcknowledge
));

export const AnalysisBoard: React.FC<AnalysisBoardProps> = React.memo(({
  cards,
  cardDataMap,
  onDragStart,
  onDragOver,
  onDrop,
  onResize,
  onRemove,
  onAddAlert,
  onSubscription,
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
  isRefreshing,
}) => {
  const [filtersHidden, setFiltersHidden] = React.useState(true);
  const [visibleCardCount, setVisibleCardCount] = React.useState(() => Math.min(cards.length, INITIAL_VISIBLE_CARDS));

  // Stable callback refs to avoid inline arrow functions causing re-renders
  const handleToggleFilters = React.useCallback(() => setFiltersHidden(v => !v), []);
  const handleHideFilters = React.useCallback(() => setFiltersHidden(true), []);
  const handleShowFilters = React.useCallback(() => setFiltersHidden(false), []);

  const globalFilterKeys = React.useMemo(
    () => (globalFilterDimensions ?? []).map(d => d.qualified_name || d.name),
    [globalFilterDimensions]
  );
  const globalFilterDimensionMap = React.useMemo(() => {
    const map = new Map<string, MetricDimension>();
    (globalFilterDimensions ?? []).forEach(d => {
      map.set(d.qualified_name || d.name, d);
    });
    return map;
  }, [globalFilterDimensions]);
  const visibleCards = React.useMemo(
    () => cards.slice(0, visibleCardCount),
    [cards, visibleCardCount]
  );

  const hasGlobalFilters = React.useMemo(
    () => globalFilterKeys.length > 0 || Boolean(onGlobalTimeRangeChange),
    [globalFilterKeys, onGlobalTimeRangeChange]
  );
  const timeRangeValue = globalTimeRange ?? '__card__';

  React.useEffect(() => {
    if (cards.length <= INITIAL_VISIBLE_CARDS) {
      setVisibleCardCount(cards.length);
      return;
    }
    // Only reset to INITIAL_VISIBLE_CARDS if we have MORE new cards than currently visible
    setVisibleCardCount(prev => {
      if (prev >= cards.length) return cards.length;
      // If cards grew by just 1-2, just show them immediately instead of resetting
      if (cards.length - prev <= 2) return cards.length;
      return INITIAL_VISIBLE_CARDS;
    });
    // Gradual rendering only when there are many cards not yet visible
    let rafId = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      setVisibleCardCount(prev => {
        if (prev >= cards.length) return prev;
        const next = Math.min(cards.length, prev + CARD_RENDER_BATCH_SIZE);
        if (next < cards.length) {
          rafId = window.requestAnimationFrame(step);
        }
        return next;
      });
    };
    // Only start batch rendering if we're below the total
    setVisibleCardCount(current => {
      if (current < cards.length) {
        rafId = window.requestAnimationFrame(step);
      }
      return current;
    });
    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [cards.length]);

  return (
    <div className="space-y-6">
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
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2 h-8">
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
          {hasGlobalFilters && (
            <Button variant="outline" size="sm" onClick={handleToggleFilters} className="gap-2 h-8">
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
          {!readOnly && onSubscription && (
            <Button variant="outline" size="sm" onClick={onSubscription} className="gap-2 h-8">
              <Clock className="w-4 h-4" />
              Subscriptions
            </Button>
          )}
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            {cards.length} {cards.length === 1 ? 'Visualization' : 'Visualizations'}
          </div>
        </div>
      </div>

      <RechartsProvider>
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
            <div className="grid grid-cols-12 gap-6" style={{ contain: 'layout style paint' }}>
              {visibleCards.map((card, index) => {
                const { chartData, rawData } = cardDataMap[card.id] ?? EMPTY_CARD_DATA;
                return (
                  <BoardCardItem
                    key={card.id}
                    card={card}
                    index={index}
                    chartData={chartData}
                    rawData={rawData}
                    readOnly={readOnly}
                    alertStatus={alertStatusMap?.[card.id]}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onResize={onResize}
                    onRemove={onRemove}
                    onAcknowledge={onAcknowledge}
                  />
                );
              })}
              {visibleCardCount < cards.length && (
                <div className="col-span-12 text-center text-sm text-muted-foreground py-4">
                  Rendering {visibleCardCount}/{cards.length} visualizations...
                </div>
              )}
            </div>
          )}
        </div>

        {hasGlobalFilters && !filtersHidden && (
          <Card className="w-[320px] shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Global Filters</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleHideFilters}>
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
                const d = globalFilterDimensionMap.get(key);
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
              onClick={handleShowFilters}
              title="Show filters"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      </RechartsProvider>
    </div>
  );
});

export default AnalysisBoard;
