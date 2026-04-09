import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { BIChartCard, BIChartType, BIMetric } from '@/model/biAnalysis';
import type { MetricDefinition, MetricFilter } from '@/model/metricsManagement';
import type { MetricDimension } from '@/model/analysis';
import type { MetricFlowResponse, MetricQueryRequest } from '@/model/metricFlow';
import type { ChartDatum } from '@/components/bi/ChartCard';
import { getCategories as getRealCategories, getMetrics as getAllMetrics, findDimensionsByMetric } from '@/services/metricsManagementService';
import type { Category } from '@/model/metricsManagement';
import { metricsService } from '@/services/metricsService';
import { transformMetricFlowToChartData, timeRangeToBounds, toTimeRangeValue } from '@/utils/biAnalysisUtils';
import { inferType } from '@/components/bi/utils';
import { useToast } from '@/components/ui/use-toast';

// ─────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────

const PREVIEW_CACHE_MAX_SIZE = 50;
const MAX_DIM_DISPLAY = 24;

const isTimeData = (data: unknown[]) => {
  if (data.length === 0) return false;
  const first = data[0];
  if (!first || typeof first !== 'object') return false;
  return typeof (first as Record<string, unknown>).date === 'string';
};

const isGroupedData = (data: unknown[]) => {
  if (data.length === 0) return false;
  const first = data[0];
  if (!first || typeof first !== 'object') return false;
  const r = first as Record<string, unknown>;
  return !('value' in r) && !('date' in r);
};

const chartTypeFromDims = (dims: string[], detailed: MetricDimension[]): BIChartType => {
  if (!Array.isArray(dims) || dims.length === 0) return 'kpi';
  const hasTimeDim = dims.some(val => {
    const found = detailed.find(d => (d.qualified_name || d.name) === val);
    return found ? inferType(found) === 'TIME' : false;
  });
  if (hasTimeDim) return 'line';
  if (dims.length >= 2) return 'groupedBar';
  return 'bar';
};

// ─────────────────────────────────────────────────────────────
// Hook Options
// ─────────────────────────────────────────────────────────────

interface UseMetricBuilderOptions {
  metricBuilderOpen: boolean;
  setMetricBuilderOpen: (open: boolean) => void;
  metricDimsCache: React.MutableRefObject<Map<string, MetricDimension[]>>;
  onCardAdded: (card: BIChartCard) => void;
  setActiveSection: (section: 'dashboard' | 'saved') => void;
}

// ─────────────────────────────────────────────────────────────
// Hook Return Type
// ─────────────────────────────────────────────────────────────

export type UseMetricBuilderReturn = {
  // Sheet props
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Metric selection
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  categories: { id: string; name: string }[];
  metricsLoading: boolean;
  metricsList: MetricDefinition[];
  selectedMetricId: string;
  onSelectMetric: (id: string, def: MetricDefinition) => void;
  selectedMetric: BIMetric | null;

  // Dimensions
  availableDimsDetailed: MetricDimension[];
  selectedDimType: string;
  onSelectedDimTypeChange: (value: string) => void;
  dimSearch: string;
  onDimSearchChange: (value: string) => void;
  filteredDims: MetricDimension[];
  selectedDims: string[];
  onToggleDim: (dim: string) => void;

  // Time & chart config
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  timeGranularity: string;
  onTimeGranularityChange: (value: string) => void;
  customDateRange: DateRange | undefined;
  onCustomDateRangeChange: (value: DateRange | undefined) => void;
  selectedChartType: BIChartType | 'auto';
  onSelectedChartTypeChange: (type: BIChartType | 'auto') => void;
  limit: number;
  onLimitChange: (limit: number) => void;

  // Preview
  previewType: BIChartType;
  previewData: ChartDatum[];
  previewRawData: MetricFlowResponse | null;

  // Add to dashboard
  onAddToDashboard: () => void;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useMetricBuilder = (options: UseMetricBuilderOptions): UseMetricBuilderReturn => {
  const { metricBuilderOpen, setMetricBuilderOpen, metricDimsCache, onCardAdded, setActiveSection } = options;
  const { toast } = useToast();

  // ── Search & Category ──
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // ── Chart Config ──
  const [chartConfig, setChartConfig] = useState<{
    metricId: string;
    metricDef: MetricDefinition | null;
    dimensions: string[];
    timeRange: string;
    timeGranularity: string;
    customDateRange: DateRange | undefined;
    chartType: BIChartType | 'auto';
    limit: number;
  }>({
    metricId: '',
    metricDef: null,
    dimensions: [],
    timeRange: 'Past 30 days',
    timeGranularity: 'day',
    customDateRange: { from: addDays(new Date(), -30), to: new Date() },
    chartType: 'auto',
    limit: 5
  });

  // ── Metrics List ──
  const [metricsList, setMetricsList] = useState<MetricDefinition[]>([]);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const [metricsRefreshNonce, setMetricsRefreshNonce] = useState(0);

  // ── Dimensions ──
  const [availableDimsDetailed, setAvailableDimsDetailed] = useState<MetricDimension[]>([]);
  const availableDims = useMemo(() => availableDimsDetailed.map(d => d.qualified_name || d.name), [availableDimsDetailed]);
  const [selectedDimType, setSelectedDimType] = useState<string>('');
  const [dimSearch, setDimSearch] = useState<string>('');
  const showTopOnly = true;

  // ── Preview ──
  const [previewState, setPreviewState] = useState<{
    data: ChartDatum[];
    rawData: MetricFlowResponse | null;
    type: BIChartType;
  }>({
    data: [],
    rawData: null,
    type: 'line'
  });

  const previewCache = useRef<Map<string, { data: unknown[]; rawData: MetricFlowResponse | null }>>(new Map());

  // LRU eviction helper for preview cache
  const ensurePreviewCacheSize = useCallback(() => {
    const cache = previewCache.current;
    if (cache.size <= PREVIEW_CACHE_MAX_SIZE) return;
    const keysToDelete = Array.from(cache.keys()).slice(0, cache.size - PREVIEW_CACHE_MAX_SIZE);
    keysToDelete.forEach(k => cache.delete(k));
  }, []);

  // ── Selected metric ──
  const selectedMetric: BIMetric | null = useMemo(() => {
    const m = chartConfig.metricDef;
    if (!m) return null;
    const unit = (m.unit || '').toLowerCase();
    const kind: 'rate' | 'amount' | 'count' = m.type === 'ratio' || unit.includes('%')
      ? 'rate'
      : (unit.includes('hkd') || unit.includes('usd') || unit.includes('¥') || unit.includes('$')) ? 'amount' : 'count';
    return {
      id: m.id ?? m.name,
      name: m.name,
      description: m.description ?? '',
      categoryId: m.categoryId ?? '',
      kind,
      dimensions: availableDims
    };
  }, [chartConfig.metricDef, availableDims]);

  const hasSelectedTimeDimension = useMemo(() => {
    if (chartConfig.dimensions.length === 0 || availableDimsDetailed.length === 0) return false;
    const selected = new Set(chartConfig.dimensions);
    return availableDimsDetailed.some(d => selected.has(d.qualified_name || d.name) && inferType(d) === 'TIME');
  }, [chartConfig.dimensions, availableDimsDetailed]);

  const previewFallbackType = useMemo<BIChartType>(() => {
    if (chartConfig.chartType !== 'auto') return chartConfig.chartType;
    return chartTypeFromDims(chartConfig.dimensions, availableDimsDetailed);
  }, [chartConfig.chartType, chartConfig.dimensions, availableDimsDetailed]);

  const previewQueryKey = useMemo(() => {
    if (!selectedMetric) return '';
    const from = chartConfig.customDateRange?.from ? format(chartConfig.customDateRange.from, 'yyyy-MM-dd') : '';
    const to = chartConfig.customDateRange?.to ? format(chartConfig.customDateRange.to, 'yyyy-MM-dd') : '';
    return JSON.stringify({
      metric: selectedMetric.name,
      dimensions: chartConfig.dimensions,
      timeRange: chartConfig.timeRange,
      from,
      to,
      timeGranularity: hasSelectedTimeDimension ? chartConfig.timeGranularity : '',
      limit: chartConfig.limit
    });
  }, [selectedMetric, chartConfig, hasSelectedTimeDimension]);

  // ── Init categories ──
  useEffect(() => {
    getRealCategories().then((list: Category[]) => setCategories(list.map(c => ({ id: c.id, name: c.name }))));
  }, []);

  // ── Load metrics for selection ──
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setMetricsLoading(true);
      try {
        if (!metricBuilderOpen) {
          setMetricsList([]);
          return;
        }
        const filter: MetricFilter = {};
        if (search && search.trim().length > 0) filter.searchTerm = search.trim();
        if (categoryId && categoryId.trim().length > 0) filter.categoryId = categoryId;
        const list = await getAllMetrics(Object.keys(filter).length ? filter : undefined);

        if (!alive) return;
        setMetricsList(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setMetricsList([]);
      } finally {
        if (alive) setMetricsLoading(false);
      }
    };

    const timer = setTimeout(load, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [search, categoryId, metricBuilderOpen, metricsRefreshNonce]);

  // ── Refresh metrics on window focus ──
  useEffect(() => {
    const onFocus = () => {
      if (metricBuilderOpen) {
        setMetricsRefreshNonce(v => v + 1);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('focus', onFocus); };
  }, [metricBuilderOpen]);

  // ── Load dimensions when metric changes ──
  useEffect(() => {
    const loadDims = async () => {
      if (!chartConfig.metricDef) {
        setAvailableDimsDetailed([]);
        setChartConfig(prev => ({ ...prev, dimensions: [] }));
        return;
      }
      try {
        const cacheKey = chartConfig.metricDef.name;
        const cachedDims = metricDimsCache.current.get(cacheKey);
        const dims = cachedDims
          ? cachedDims
          : await findDimensionsByMetric(chartConfig.metricDef.name).then(resp => {
              const resolved = Array.isArray(resp?.dimensions) ? resp.dimensions : [];
              metricDimsCache.current.set(cacheKey, resolved);
              return resolved;
            });
        setAvailableDimsDetailed(dims);
        const types = Array.from(new Set(dims.map(inferType)));
        setSelectedDimType(types[0] ?? 'CATEGORICAL');
      } catch (e) {
        console.warn('Failed to load metric dimensions, defaulting to empty.', e);
        setAvailableDimsDetailed([]);
        setSelectedDimType('');
      }
      setChartConfig(prev => ({ ...prev, dimensions: [] }));
    };
    loadDims();
  }, [chartConfig.metricDef, metricDimsCache]);

  // ── Preview update with real data ──
  useEffect(() => {
    let alive = true;
    const loadPreview = async () => {
      if (!selectedMetric) {
        if (alive) {
          setPreviewState({ data: [], rawData: null, type: previewFallbackType });
        }
        return;
      }

      try {
        const cached = previewCache.current.get(previewQueryKey);
        if (cached) {
          let cachedType: BIChartType = 'bar';
          if (chartConfig.chartType !== 'auto') {
            cachedType = chartConfig.chartType;
          } else if (isTimeData(cached.data)) {
            cachedType = 'line';
          } else if (isGroupedData(cached.data)) {
            cachedType = 'groupedBar';
          } else if (!chartConfig.dimensions || chartConfig.dimensions.length === 0) {
            cachedType = 'kpi';
          } else {
            cachedType = previewFallbackType;
          }
          if (alive) {
            setPreviewState({ data: cached.data as ChartDatum[], rawData: cached.rawData, type: cachedType });
          }
          return;
        }

        const { start, end } = timeRangeToBounds(chartConfig.timeRange, chartConfig.customDateRange);
        
        let groupBy = chartConfig.dimensions.length > 0 ? [...chartConfig.dimensions] : undefined;
        if (hasSelectedTimeDimension && chartConfig.timeGranularity && groupBy) {
          groupBy = groupBy.map(dim => `${dim}__${chartConfig.timeGranularity}`);
        }

        const req: MetricQueryRequest = {
          metric: selectedMetric.name,
          group_by: groupBy,
          start_time: start,
          end_time: end,
          order: [],
          limit: chartConfig.limit
        };
        const resp = await metricsService.getMetricValue(req);
        const data = transformMetricFlowToChartData(resp);
        previewCache.current.set(previewQueryKey, { data, rawData: resp });
        ensurePreviewCacheSize();
        if (alive) {
          let type: BIChartType = 'bar';
          if (chartConfig.chartType !== 'auto') {
            type = chartConfig.chartType;
          } else if (isTimeData(data)) {
            type = 'line';
          } else if (isGroupedData(data)) {
            type = 'groupedBar';
          } else if (!chartConfig.dimensions || chartConfig.dimensions.length === 0) {
            type = 'kpi';
          }

          setPreviewState({ data, rawData: resp, type });
        }
      } catch (e) {
        console.warn('Preview: failed to load real data, showing empty.', e);
        if (alive) {
          setPreviewState({ data: [], rawData: null, type: previewFallbackType });
        }
      }
    };
    const timer = window.setTimeout(() => {
      void loadPreview();
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [
    selectedMetric,
    previewQueryKey,
    chartConfig,
    hasSelectedTimeDimension,
    previewFallbackType,
    ensurePreviewCacheSize,
  ]);

  // ── Metric builder handlers ──
  const handleMetricBuilderOpenChange = useCallback((open: boolean) => {
    setMetricBuilderOpen(open);
  }, [setMetricBuilderOpen]);

  const handleMetricSelect = useCallback((id: string, def: MetricDefinition) => {
    setChartConfig(prev => ({ ...prev, metricId: id, metricDef: def }));
  }, []);

  const handleTimeRangeChange = useCallback((value: string) => {
    setChartConfig(prev => ({ ...prev, timeRange: value }));
  }, []);

  const handleTimeGranularityChange = useCallback((value: string) => {
    setChartConfig(prev => ({ ...prev, timeGranularity: value }));
  }, []);

  const handleCustomDateRangeChange = useCallback((value: DateRange | undefined) => {
    setChartConfig(prev => ({ ...prev, customDateRange: value }));
  }, []);

  const handleSelectedChartTypeChange = useCallback((value: BIChartType | 'auto') => {
    setChartConfig(prev => ({ ...prev, chartType: value }));
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setChartConfig(prev => ({ ...prev, limit: value }));
  }, []);

  const toggleDim = useCallback((dim: string) => {
    setChartConfig(prev => {
      const dimensions = prev.dimensions.includes(dim)
        ? prev.dimensions.filter(d => d !== dim)
        : [...prev.dimensions, dim];
      return { ...prev, dimensions };
    });
  }, []);

  const filteredDims = useMemo(() => {
    const term = dimSearch.trim().toLowerCase();
    const byType = availableDimsDetailed.filter(d => inferType(d) === (selectedDimType || 'CATEGORICAL'));
    const bySearch = term
      ? byType.filter(d => (`${d.description ?? ''} ${d.qualified_name ?? ''} ${d.name ?? ''}`).toLowerCase().includes(term))
      : byType;
    const sorted = [...bySearch].sort((a, b) => {
      const ia = typeof a.importance === 'number' ? a.importance as number : 0;
      const ib = typeof b.importance === 'number' ? b.importance as number : 0;
      return ib - ia;
    });
    if (showTopOnly) return sorted.slice(0, MAX_DIM_DISPLAY);
    return sorted;
  }, [availableDimsDetailed, selectedDimType, dimSearch, showTopOnly]);

  // ── Add card to dashboard ──
  const addCardToBoard = useCallback(() => {
    if (!selectedMetric) {
      toast({ title: 'Please select a metric', description: 'Select a metric on the left before adding a card' });
      return;
    }

    const finalTimeRange = toTimeRangeValue(chartConfig.timeRange, chartConfig.customDateRange);
    if (finalTimeRange === null) {
      toast({ title: 'Invalid Date Range', description: 'Please select start and end dates' });
      return;
    }

    let chartTypeForBoard: BIChartType = chartTypeFromDims(chartConfig.dimensions, availableDimsDetailed);
    
    if (chartConfig.chartType !== 'auto') {
      chartTypeForBoard = chartConfig.chartType;
    } else if (previewState.data.length > 0) {
       chartTypeForBoard = previewState.type;
    }

    const titleTimeRange = chartConfig.timeRange === 'Custom' && chartConfig.customDateRange?.from && chartConfig.customDateRange?.to
      ? `${format(chartConfig.customDateRange.from, 'yyyy-MM-dd')} to ${format(chartConfig.customDateRange.to, 'yyyy-MM-dd')}`
      : chartConfig.timeRange;

    const newCard: BIChartCard = {
      id: `card_${Date.now()}`,
      title: `${selectedMetric.name} · ${titleTimeRange}`,
      metricId: selectedMetric.name,
      chartType: chartTypeForBoard,
      size: 'md',
      selection: { 
        dimensions: chartConfig.dimensions, 
        timeRange: finalTimeRange,
        timeGranularity: hasSelectedTimeDimension ? chartConfig.timeGranularity : undefined,
        limit: chartConfig.limit
      }
    };

    // Use the callback to let the parent handle the card addition
    // This avoids the parent having to subscribe to state changes
    onCardAdded(newCard);
    toast({ title: 'Added', description: 'Chart has been added to the analysis board' });
    setActiveSection('dashboard');
    setMetricBuilderOpen(false);
  }, [selectedMetric, chartConfig, availableDimsDetailed, previewState, hasSelectedTimeDimension, toast, onCardAdded, setActiveSection, setMetricBuilderOpen]);

  return {
    // Sheet props
    open: metricBuilderOpen,
    onOpenChange: handleMetricBuilderOpenChange,

    // Metric selection
    search,
    onSearchChange: setSearch,
    categoryId,
    onCategoryIdChange: setCategoryId,
    categories,
    metricsLoading,
    metricsList,
    selectedMetricId: chartConfig.metricId,
    onSelectMetric: handleMetricSelect,
    selectedMetric,

    // Dimensions
    availableDimsDetailed,
    selectedDimType,
    onSelectedDimTypeChange: setSelectedDimType,
    dimSearch,
    onDimSearchChange: setDimSearch,
    filteredDims,
    selectedDims: chartConfig.dimensions,
    onToggleDim: toggleDim,

    // Time & chart config
    timeRange: chartConfig.timeRange,
    onTimeRangeChange: handleTimeRangeChange,
    timeGranularity: chartConfig.timeGranularity,
    onTimeGranularityChange: handleTimeGranularityChange,
    customDateRange: chartConfig.customDateRange,
    onCustomDateRangeChange: handleCustomDateRangeChange,
    selectedChartType: chartConfig.chartType,
    onSelectedChartTypeChange: handleSelectedChartTypeChange,
    limit: chartConfig.limit,
    onLimitChange: handleLimitChange,

    // Preview
    previewType: previewState.type,
    previewData: previewState.data,
    previewRawData: previewState.rawData,

    // Add to dashboard
    onAddToDashboard: addCardToBoard,
  };
};
