import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { BIChartCard, BIChartType, BIMetric } from '@/model/biAnalysis';
import type { MetricDefinition, MetricFilter } from '@/model/metricsManagement';
import type { MetricDimension } from '@/model/analysis';
import type { MetricFlowResponse, MetricQueryRequest } from '@/model/metricFlow';
import type { ChartDatum } from '@/components/bi/ChartCard';
import type { ChartFacetGroup } from '@/utils/biAnalysisUtils';
import { transformMetricFlowToChart, timeRangeToBounds, toTimeRangeValue } from '@/utils/biAnalysisUtils';
import { buildGroupBy, isTimeDimensionByName, MAX_MULTI_DIM_ROWS } from '@/utils/dimensionQuery';
import { applyDimensionRole, resolveDimensionRoles } from '@/components/bi/dimensionRoles';
import type { DimensionRole } from '@/components/bi/dimensionRoles';
import { getCategories as getRealCategories, getMetrics as getAllMetrics, findDimensionsByMetric } from '@/services/metricsManagementService';
import type { Category } from '@/model/metricsManagement';
import { metricsService } from '@/services/metricsService';
import { inferType } from '@/components/bi/utils';
import { extractChartKeys } from '@/components/bi/charts/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────

const PREVIEW_CACHE_MAX_SIZE = 50;
const MAX_DIM_DISPLAY = 24;

type BuilderChartConfig = {
  metricId: string;
  metricDef: MetricDefinition | null;
  dimensions: string[];
  axisDimension?: string;
  seriesDimension?: string;
  facetDimension?: string;
  timeRange: string;
  timeGranularity: string;
  customDateRange: DateRange | undefined;
  chartType: BIChartType | 'auto';
  limit: number;
};

const createDefaultChartConfig = (): BuilderChartConfig => ({
  metricId: '',
  metricDef: null,
  dimensions: [],
  axisDimension: undefined,
  seriesDimension: undefined,
  facetDimension: undefined,
  timeRange: 'Past 30 days',
  timeGranularity: 'day',
  customDateRange: { from: addDays(new Date(), -30), to: new Date() },
  chartType: 'auto',
  limit: 5
});

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

// Time-series data with many series reads better as a stacked bar (composition
// over time) than as a tangle of overlapping lines
const pickTimeSeriesType = (data: unknown[]): BIChartType => {
  return extractChartKeys(data as ChartDatum[]).length > 5 ? 'stackedBar' : 'line';
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
  // Grouped props for stable references — reduces re-render cost
  sheetProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
  metricSelectionProps: {
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
  };
  dimensionProps: {
    availableDimsDetailed: MetricDimension[];
    selectedDimType: string;
    onSelectedDimTypeChange: (value: string) => void;
    dimSearch: string;
    onDimSearchChange: (value: string) => void;
    filteredDims: MetricDimension[];
    selectedDims: string[];
    onToggleDim: (dim: string) => void;
    /** True when the top-N dimension list hides more matching dimensions */
    dimsTruncated: boolean;
    /** Total matching dimensions for the current type/search filter */
    matchedDimsCount: number;
    showAllDims: boolean;
    onShowAllDimsChange: (showAll: boolean) => void;
    /** Resolved role per selected dimension (explicit roles win over defaults) */
    dimensionRoles: { dimension: string; role: DimensionRole }[];
    onDimensionRoleChange: (dimension: string, role: DimensionRole) => void;
  };
  configProps: {
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
  };
  previewProps: {
    previewType: BIChartType;
    previewData: ChartDatum[];
    previewFacets: ChartFacetGroup[] | null;
    previewRawData: MetricFlowResponse | null;
  };

  // Add to dashboard
  onAddToDashboard: () => void;
};

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export const useMetricBuilder = (options: UseMetricBuilderOptions): UseMetricBuilderReturn => {
  const { metricBuilderOpen, setMetricBuilderOpen, metricDimsCache, onCardAdded, setActiveSection } = options;
  const { toast } = useToast();
  // Console users only see published metrics in the metric settings sheet.
  const { isConsoleUser } = useAuth();

  // ── Search & Category ──
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // ── Chart Config ──
  const [chartConfig, setChartConfig] = useState<BuilderChartConfig>(createDefaultChartConfig);

  // ── Metrics List ──
  const [metricsList, setMetricsList] = useState<MetricDefinition[]>([]);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);

  // ── Dimensions ──
  const [availableDimsDetailed, setAvailableDimsDetailed] = useState<MetricDimension[]>([]);
  const availableDims = useMemo(() => availableDimsDetailed.map(d => d.qualified_name || d.name), [availableDimsDetailed]);
  const [selectedDimType, setSelectedDimType] = useState<string>('');
  const [dimSearch, setDimSearch] = useState<string>('');
  // The list only renders the top-N dimensions by importance by default; the
  // "show all" switch reveals every matching dimension of the metric.
  const [showAllDims, setShowAllDims] = useState(false);

  // ── Preview ──
  const [previewState, setPreviewState] = useState<{
    data: ChartDatum[];
    facets: ChartFacetGroup[] | null;
    rawData: MetricFlowResponse | null;
    type: BIChartType;
  }>({
    data: [],
    facets: null,
    rawData: null,
    type: 'line'
  });

  // Time check against the real dimension metadata, falling back to name
  // sniffing for unknown dims (same rule the board loader applies).
  const resolveIsTimeDim = useCallback((dim: string): boolean => {
    const found = availableDimsDetailed.find(d => (d.qualified_name || d.name) === dim);
    return found ? inferType(found) === 'TIME' : isTimeDimensionByName(dim);
  }, [availableDimsDetailed]);

  const previewCache = useRef<Map<string, { data: unknown[]; facets: ChartFacetGroup[] | null; rawData: MetricFlowResponse | null }>>(new Map());

  // Latest chart config for callbacks that must not re-create on every keystroke
  const chartConfigRef = useRef(chartConfig);
  chartConfigRef.current = chartConfig;

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
      axisDimension: chartConfig.axisDimension,
      seriesDimension: chartConfig.seriesDimension,
      facetDimension: chartConfig.facetDimension,
      timeRange: chartConfig.timeRange,
      from,
      to,
      timeGranularity: hasSelectedTimeDimension ? chartConfig.timeGranularity : '',
      limit: chartConfig.limit
    });
  }, [selectedMetric, chartConfig, hasSelectedTimeDimension]);

  // ── Init categories (lazily, on first builder open) ──
  const categoriesLoadedRef = useRef(false);
  useEffect(() => {
    if (!metricBuilderOpen || categoriesLoadedRef.current) return;
    categoriesLoadedRef.current = true;
    getRealCategories().then((list: Category[]) => setCategories(list.map(c => ({ id: c.id, name: c.name }))));
  }, [metricBuilderOpen]);

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
        // Undefined publishStatus means draft, so console users only get explicit `published`.
        const visible = isConsoleUser
          ? (Array.isArray(list) ? list : []).filter(m => m.publishStatus === 'published')
          : (Array.isArray(list) ? list : []);
        setMetricsList(visible);
      } catch (e) {
        if (!alive) return;
        setMetricsList([]);
      } finally {
        if (alive) setMetricsLoading(false);
      }
    };

    const timer = setTimeout(load, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [search, categoryId, metricBuilderOpen, isConsoleUser]);

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
      setShowAllDims(false);
    };
    loadDims();
  }, [chartConfig.metricDef, metricDimsCache]);

  // ── Preview update with real data ──
  useEffect(() => {
    let alive = true;
    const loadPreview = async () => {
      if (!selectedMetric) {
        if (alive) {
          setPreviewState({ data: [], facets: null, rawData: null, type: previewFallbackType });
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
            cachedType = pickTimeSeriesType(cached.data);
          } else if (isGroupedData(cached.data)) {
            cachedType = 'groupedBar';
          } else if (!chartConfig.dimensions || chartConfig.dimensions.length === 0) {
            cachedType = 'kpi';
          } else {
            cachedType = previewFallbackType;
          }
          if (alive) {
            setPreviewState({ data: cached.data as ChartDatum[], facets: cached.facets, rawData: cached.rawData, type: cachedType });
          }
          return;
        }

        const { start, end } = timeRangeToBounds(chartConfig.timeRange, chartConfig.customDateRange);

        const roleOptions = {
          axisDimension: chartConfig.axisDimension,
          seriesDimension: chartConfig.seriesDimension,
          facetDimension: chartConfig.facetDimension,
          isTimeDimension: resolveIsTimeDim,
        };

        // Only TIME dimensions get the granularity suffix; a single dimension
        // with the limit becomes a true server-side Top-N by measure.
        const groupBy = buildGroupBy(chartConfig.dimensions, hasSelectedTimeDimension ? chartConfig.timeGranularity : undefined, resolveIsTimeDim);
        const limit = chartConfig.dimensions.length <= 1 ? chartConfig.limit : MAX_MULTI_DIM_ROWS;

        const req: MetricQueryRequest = {
          metric: selectedMetric.name,
          group_by: groupBy,
          start_time: start,
          end_time: end,
          // Server-side Top-N: "-" prefix = order by measure descending
          order: [`-${selectedMetric.name}`],
          limit
        };
        const resp = await metricsService.getMetricValue(req);
        const dataset = transformMetricFlowToChart(resp, roleOptions);
        const data = dataset.rows;
        previewCache.current.set(previewQueryKey, { data, facets: dataset.facets, rawData: resp });
        ensurePreviewCacheSize();
        if (alive) {
          let type: BIChartType = 'bar';
          if (chartConfig.chartType !== 'auto') {
            type = chartConfig.chartType;
          } else if (isTimeData(data)) {
            type = pickTimeSeriesType(data);
          } else if (isGroupedData(data)) {
            type = 'groupedBar';
          } else if (!chartConfig.dimensions || chartConfig.dimensions.length === 0) {
            type = 'kpi';
          }

          setPreviewState({ data, facets: dataset.facets, rawData: resp, type });
        }
      } catch (e) {
        console.warn('Preview: failed to load real data, showing empty.', e);
        if (alive) {
          setPreviewState({ data: [], facets: null, rawData: null, type: previewFallbackType });
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
    resolveIsTimeDim,
  ]);

  // ── Metric builder handlers ──
  // Once a card is added to the board, every selection is cleared so the next
  // time the builder opens it presents a fresh state instead of the stale
  // metric/dimensions/preview from the previous round.
  const resetBuilder = useCallback(() => {
    setSearch('');
    setCategoryId('');
    setChartConfig(createDefaultChartConfig());
    setSelectedDimType('');
    setDimSearch('');
    setShowAllDims(false);
    setPreviewState({ data: [], facets: null, rawData: null, type: 'line' });
  }, []);

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
    // Both selecting and deselecting a dimension must re-query the backend,
    // so evict this metric's cached previews; otherwise toggling back to a
    // previously-seen dimension set would be served from cache without a fetch.
    const metricName = chartConfigRef.current.metricDef?.name;
    if (metricName) {
      const marker = `"metric":${JSON.stringify(metricName)}`;
      Array.from(previewCache.current.keys()).forEach(key => {
        if (key.includes(marker)) previewCache.current.delete(key);
      });
    }
    setChartConfig(prev => {
      const dimensions = prev.dimensions.includes(dim)
        ? prev.dimensions.filter(d => d !== dim)
        : [...prev.dimensions, dim];
      // A removed dimension must not keep a stale explicit role
      const roles = applyDimensionRole(prev, dim, 'detail');
      return { ...prev, dimensions, ...roles };
    });
  }, []);

  const handleDimensionRoleChange = useCallback((dimension: string, role: DimensionRole) => {
    setChartConfig(prev => ({ ...prev, ...applyDimensionRole(prev, dimension, role) }));
  }, []);

  // Resolved role per selected dimension for the builder UI: explicit roles
  // win, the rest fall back to the shared inference rules (time → axis,
  // next dimension → series).
  const dimensionRoleOptions = useMemo(
    () => resolveDimensionRoles(chartConfig, resolveIsTimeDim),
    [chartConfig, resolveIsTimeDim]
  );
  const selectedDimensionRoles = useMemo(() => {
    const roles: { dimension: string; role: DimensionRole }[] = chartConfig.dimensions.map(dimension => ({
      dimension,
      role: 'detail' as DimensionRole,
    }));
    const assign = (dimension: string | undefined, role: DimensionRole) => {
      if (!dimension) return;
      const entry = roles.find(r => r.dimension === dimension);
      if (entry) entry.role = role;
    };
    assign(dimensionRoleOptions.axisDimension, 'axis');
    assign(dimensionRoleOptions.seriesDimension, 'series');
    assign(dimensionRoleOptions.facetDimension, 'facet');
    return roles;
  }, [chartConfig.dimensions, dimensionRoleOptions]);

  const filteredDimsInfo = useMemo(() => {
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
    return {
      matched: sorted,
      visible: showAllDims ? sorted : sorted.slice(0, MAX_DIM_DISPLAY),
      truncated: !showAllDims && sorted.length > MAX_DIM_DISPLAY,
    };
  }, [availableDimsDetailed, selectedDimType, dimSearch, showAllDims]);
  const filteredDims = filteredDimsInfo.visible;

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
        axisDimension: dimensionRoleOptions.axisDimension,
        seriesDimension: dimensionRoleOptions.seriesDimension,
        facetDimension: dimensionRoleOptions.facetDimension,
        timeRange: finalTimeRange,
        timeGranularity: hasSelectedTimeDimension ? chartConfig.timeGranularity : undefined,
        limit: chartConfig.limit
      }
    };

    // Use the callback to let the parent handle the card addition
    // This avoids the parent having to subscribe to state changes
    onCardAdded(newCard);
    resetBuilder();
    toast({ title: 'Added', description: 'Chart has been added to the analysis board' });
    setActiveSection('dashboard');
    setMetricBuilderOpen(false);
  }, [selectedMetric, chartConfig, availableDimsDetailed, previewState, hasSelectedTimeDimension, dimensionRoleOptions, toast, onCardAdded, setActiveSection, setMetricBuilderOpen, resetBuilder]);

  // ── Stable return value groups to minimize re-renders of MetricBuilderSheet ──
  // Sheet props (stable: open/onOpenChange change rarely)
  const sheetProps = useMemo(() => ({
    open: metricBuilderOpen,
    onOpenChange: handleMetricBuilderOpenChange,
  }), [metricBuilderOpen, handleMetricBuilderOpenChange]);

  // Metric selection props
  const metricSelectionProps = useMemo(() => ({
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
  }), [search, categoryId, categories, metricsLoading, metricsList, chartConfig.metricId, handleMetricSelect, selectedMetric]);

  // Dimension props
  const dimensionProps = useMemo(() => ({
    availableDimsDetailed,
    selectedDimType,
    onSelectedDimTypeChange: setSelectedDimType,
    dimSearch,
    onDimSearchChange: setDimSearch,
    filteredDims,
    selectedDims: chartConfig.dimensions,
    onToggleDim: toggleDim,
    dimsTruncated: filteredDimsInfo.truncated,
    matchedDimsCount: filteredDimsInfo.matched.length,
    showAllDims,
    onShowAllDimsChange: setShowAllDims,
    dimensionRoles: selectedDimensionRoles,
    onDimensionRoleChange: handleDimensionRoleChange,
  }), [availableDimsDetailed, selectedDimType, dimSearch, filteredDims, chartConfig.dimensions, toggleDim, filteredDimsInfo, showAllDims, selectedDimensionRoles, handleDimensionRoleChange]);

  // Config props
  const configProps = useMemo(() => ({
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
  }), [chartConfig.timeRange, chartConfig.timeGranularity, chartConfig.customDateRange, chartConfig.chartType, chartConfig.limit,
      handleTimeRangeChange, handleTimeGranularityChange, handleCustomDateRangeChange, handleSelectedChartTypeChange, handleLimitChange]);

  // Preview props
  const previewProps = useMemo(() => ({
    previewType: previewState.type,
    previewData: previewState.data,
    previewFacets: previewState.facets,
    previewRawData: previewState.rawData,
  }), [previewState]);

  return {
    sheetProps,
    metricSelectionProps,
    dimensionProps,
    configProps,
    previewProps,
    onAddToDashboard: addCardToBoard,
  };
};
