import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { 
  LayoutDashboard, 
  Plus, 
  Save, 
  Trash2, 
  LayoutTemplate, 
  RotateCcw, 
  Share2, 
  Copy
} from 'lucide-react';
import { AnalysisBoard } from '@/components/bi/AnalysisBoard';
import { MetricBuilderSheet } from '@/components/bi/MetricBuilderSheet';
import { SubscriptionModal } from '@/components/bi/SubscriptionModal';
import { inferType } from '@/components/bi/utils';
import { BIChartCard, BICardSize, BIMetric, BIChartType, GlobalAlertRule } from '@/model/biAnalysis';
import type { ChartDatum } from '@/components/bi/ChartCard';
import { saveAnalysis, listAnalyses, getAnalysis, deleteAnalysis, updateAnalysis, updateAnalysisTemplate } from '@/services/biAnalysisService';
import { metricsService } from '@/services/metricsService';
import { globalAlertService } from '@/services/globalAlertService';
import { getCategories as getRealCategories, getMetrics as getAllMetrics, findDimensionsByMetric } from '@/services/metricsManagementService';
import type { MetricDefinition, Category, MetricFilter } from '@/model/metricsManagement';
import type { MetricDimension } from '@/model/analysis';
import type { MetricFlowResponse, MetricQueryRequest } from '@/model/metricFlow';
import type { AlertStatus } from '@/model/AlertConfig';
import { useAuth } from '@/contexts/AuthContext';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays, format } from "date-fns";

const GLOBAL_TIME_RANGE_PER_CARD = '__card__';

type FetchCardDataResult = {
  id: string;
  type: 'chart';
  data: ChartDatum[];
  rawData: MetricFlowResponse | null;
  status?: never;
} | {
  id: string;
  type: 'alert';
  data: ChartDatum[];
  rawData: null;
  status: AlertStatus | null;
};

const toDimKey = (d: MetricDimension) => d.qualified_name || d.name;

const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

const toCustomRangeString = (range?: DateRange): string | null => {
  if (range?.from && range?.to) return `Custom:${formatDate(range.from)}:${formatDate(range.to)}`;
  return null;
};

const toTimeRangeValue = (range: string, customDateRange?: DateRange): string | null => {
  if (range !== 'Custom') return range;
  return toCustomRangeString(customDateRange);
};

const timeRangeToBounds = (range: string, customDateRange?: DateRange): { start: string; end: string } => {
  if (range.startsWith('Custom:')) {
    const parts = range.split(':');
    if (parts.length === 3) return { start: parts[1], end: parts[2] };
  }

  if (range === 'Custom') {
    const custom = toCustomRangeString(customDateRange);
    if (custom) {
      const [, start, end] = custom.split(':');
      return { start, end };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start: formatDate(start), end: formatDate(end) };
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  switch (range) {
    case 'Past 7 days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'Past 30 days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'Past 90 days':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'Past year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toDateStr(startDate), end: toDateStr(endDate) };
};

const resolveTimeRange = (
  card: BIChartCard,
  globalTimeRange: string,
  globalCustomDateRange: DateRange | undefined,
  timeRangeOverride?: string
) => {
  const range = timeRangeOverride ?? globalTimeRange;
  if (range === GLOBAL_TIME_RANGE_PER_CARD) return card.selection.timeRange;
  if (range === 'Custom') return toCustomRangeString(globalCustomDateRange) ?? 'Past 30 days';
  return range;
};

const buildGlobalWhere = (filters: Record<string, string>): string | undefined => {
  const parts = Object.entries(filters)
    .map(([k, v]) => [k.trim(), v.trim()] as const)
    .filter(([k, v]) => k.length > 0 && v.length > 0)
    .map(([k, v]) => `${k} = '${v.replace(/'/g, "''")}'`);
  return parts.length > 0 ? parts.join(' AND ') : undefined;
};

const transformMetricFlowToChartData = (resp: MetricFlowResponse): ChartDatum[] => {
  if (!resp || !Array.isArray(resp.column_names) || !Array.isArray(resp.data)) return [];
  const cols = resp.column_names;
  const valueIdx = Math.max(cols.lastIndexOf('value'), cols.length - 1);
  const dimIdxs = cols.map((_, i) => i).filter(i => i !== valueIdx);
  const timeKeywords = ['date', 'day', 'month', 'week', 'quarter', 'year', 'hour', 'minute', 'second', 'time', 'timestamp', 'datetime', 'created_at', 'updated_at'];
  const timeIdx = dimIdxs.find(i => timeKeywords.some(k => String(cols[i] ?? '').toLowerCase().includes(k)));

  const fmt = (v: unknown) => (v === null || v === undefined) ? 'Null' : String(v);

  // Case: Time Series (Single Dimension)
  if (dimIdxs.length === 1 && typeof timeIdx === 'number') {
    const acc = new Map<string, number>();
    for (const row of resp.data) {
      const t = fmt(row[timeIdx]);
      const v = Number(row[valueIdx] ?? 0);
      acc.set(t, (acc.get(t) ?? 0) + v);
    }
    const entries = Array.from(acc.entries());
    const parsed = entries.map(([t, v]) => ({ t, v, d: Date.parse(t) }));
    parsed.sort((a, b) => (Number.isFinite(a.d) && Number.isFinite(b.d)) ? a.d - b.d : a.t.localeCompare(b.t));
    return parsed.map(p => ({ date: p.t, value: p.v }));
  }

  // Case: Multi-dimensional (Pivot)
  if (dimIdxs.length >= 2) {
    let mainAxisIdx = dimIdxs[0];
    let groupIdx = dimIdxs[1];
    let isTimeAxis = false;

    // If there is a time dimension, force it to be the X-axis
    if (typeof timeIdx === 'number') {
      mainAxisIdx = timeIdx;
      // Use the first non-time dimension as the grouping key
      const nonTimeIdx = dimIdxs.find(i => i !== timeIdx);
      if (nonTimeIdx !== undefined) {
        groupIdx = nonTimeIdx;
      }
      isTimeAxis = true;
    }

    const pivotMap = new Map<string, Record<string, unknown>>();
    for (const row of resp.data) {
      const axisVal = fmt(row[mainAxisIdx]);
      const groupVal = fmt(row[groupIdx]);
      const val = Number(row[valueIdx] ?? 0);

      if (!pivotMap.has(axisVal)) {
        pivotMap.set(axisVal, { [isTimeAxis ? 'date' : 'name']: axisVal });
      }
      const record = pivotMap.get(axisVal)!;
      // Accumulate if there are duplicate entries for the same axis+group
      const cur = record[groupVal];
      record[groupVal] = (typeof cur === 'number' ? cur : 0) + val;
    }
    
    const result = Array.from(pivotMap.values());
    
    // Sort by time if it is a time axis
    if (isTimeAxis) {
       result.sort((a, b) => {
         const da = Date.parse(String(a.date));
         const db = Date.parse(String(b.date));
         if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
         return String(a.date).localeCompare(String(b.date));
       });
    }

    return result.map(r => r as ChartDatum);
  }

  // Case: Single non-time dimension
  return resp.data.map(row => {
    const nameParts = dimIdxs.map(i => fmt(row[i])).filter(s => s.length > 0);
    const name = nameParts.length > 0 ? nameParts.join(' · ') : 'Total';
    const value = Number(row[valueIdx] ?? 0);
    return { name, value };
  });
};

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

const BIAnalysisPage: React.FC = () => {
  const { toast } = useToast();
  const { collapsed } = useSidebar();
  const { user } = useAuth();


  // Current analysis ID being edited (null if new)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  // selector states
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  
  // Metric Builder Configuration State
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

  const [metricsList, setMetricsList] = useState<MetricDefinition[]>([]);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const [metricsRefreshNonce, setMetricsRefreshNonce] = useState(0);
  // Derived availableDims from detailed list
  const [availableDimsDetailed, setAvailableDimsDetailed] = useState<MetricDimension[]>([]);
  const availableDims = useMemo(() => availableDimsDetailed.map(d => d.qualified_name || d.name), [availableDimsDetailed]);

  const [selectedDimType, setSelectedDimType] = useState<string>('');
  const [dimSearch, setDimSearch] = useState<string>('');
  const showTopOnly = true;

  // Preview State
  const [previewState, setPreviewState] = useState<{
    data: ChartDatum[];
    rawData: MetricFlowResponse | null;
    type: BIChartType;
  }>({
    data: [],
    rawData: null,
    type: 'line'
  });

  // Alert Configuration State (Removed)
  const [addAlertOpen, setAddAlertOpen] = useState(false);
  const [alertRuleId, setAlertRuleId] = useState('');
  const [dialogRules, setDialogRules] = useState<GlobalAlertRule[]>([]);
  const [alertTimeRange, setAlertTimeRange] = useState<string>('Past 30 days');
  const [alertCustomDateRange, setAlertCustomDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // board
  const [cards, setCards] = useState<BIChartCard[]>([]);
  const [cardDataMap, setCardDataMap] = useState<Record<string, { chartData: ChartDatum[], rawData: MetricFlowResponse | null }>>({});
  const [alertStatusMap, setAlertStatusMap] = useState<Record<string, AlertStatus>>({});
  const [metricBuilderOpen, setMetricBuilderOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'saved'>('dashboard');
  const dashboardViewRef = useRef<HTMLDivElement>(null);
  const [pendingScrollToDashboard, setPendingScrollToDashboard] = useState(false);
  
  const [commonFilterDimensions, setCommonFilterDimensions] = useState<MetricDimension[]>([]);
  const [globalFilterValues, setGlobalFilterValues] = useState<Record<string, string>>({});
  const [globalTimeRange, setGlobalTimeRange] = useState<string>(GLOBAL_TIME_RANGE_PER_CARD);
  const [globalCustomDateRange, setGlobalCustomDateRange] = useState<DateRange | undefined>();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; description?: string; isTemplate?: boolean }[]>([]);
  const [isBoardRefreshing, setIsBoardRefreshing] = useState(false);

  // Cache for metric dimensions to avoid re-fetching
  const metricDimsCache = useRef<Map<string, MetricDimension[]>>(new Map());
  const previewCache = useRef<Map<string, { data: unknown[]; rawData: MetricFlowResponse | null }>>(new Map());
  const cardQueryCache = useRef<Map<string, { result: FetchCardDataResult; timestamp: number }>>(new Map());
  const cardInFlightRequests = useRef<Map<string, number>>(new Map());
  const boardRefreshRequestRef = useRef(0);
  const globalFilterDebounceRef = useRef<number | null>(null);

  const CARD_QUERY_CACHE_TTL = 30_000;

  // Fetch rules when alert metric changes
  useEffect(() => {
    if (addAlertOpen) {
      globalAlertService.getGlobalAlertRules().then(rules => {
        setDialogRules(rules);
        setAlertRuleId('');
      });
    } else {
      setDialogRules([]);
    }
  }, [addAlertOpen]);

  // Fetch and cache card data
  const fetchCardData = useCallback(async (card: BIChartCard, filtersOverride?: Record<string, string>, timeRangeOverride?: string): Promise<FetchCardDataResult | null> => {
    try {
      if (card.chartType === 'alert' && card.alert) {
        if (!card.alert.enabled) {
          return { id: card.id, type: 'alert', data: [], rawData: null, status: null };
        }
        const resp = await globalAlertService.fetchAlertData(card.alert as GlobalAlertRule);
        
        let chartData: ChartDatum[] = [];
        if (resp && Array.isArray(resp.data)) {
           chartData = (resp.data as ChartDatum[]);
        } else if (Array.isArray(resp)) {
           chartData = (resp as ChartDatum[]);
        }

        let status: AlertStatus | null = null;
        if (resp && typeof resp.triggered === 'boolean') {
           if (resp.alertStatus) {
              status = resp.alertStatus;
           } else {
              const alertRule = card.alert as GlobalAlertRule;
              const priority = alertRule.priority || 'medium';
              let severity: 'info' | 'warning' | 'critical' = 'info';
              if (priority === 'critical') severity = 'critical';
              else if (priority === 'high') severity = 'warning';
              
              status = {
                id: `alert-status-${card.id}`, 
                ruleId: alertRule.id || card.id,
                ruleName: alertRule.name || 'Alert',
                triggered: resp.triggered,
                severity: severity,
                message: resp.message || (resp.triggered ? 'Alert Triggered' : 'Normal'),
                acknowledged: resp.acknowledged || false,
                conditionResults: resp.conditionResults || []
              };
           }
        }
        return { id: card.id, type: 'alert', data: chartData, rawData: null, status };
      }

      const resolvedRange = resolveTimeRange(card, globalTimeRange, globalCustomDateRange, timeRangeOverride);
      const { start, end } = timeRangeToBounds(resolvedRange);
      let groupBy = card.selection.dimensions && card.selection.dimensions.length > 0 ? [...card.selection.dimensions] : undefined;
      
      if (card.selection.timeGranularity && groupBy) {
        groupBy = groupBy.map(dim => {
          if (inferType({ name: dim } as MetricDimension) === 'TIME') {
            return `${dim}__${card.selection.timeGranularity}`;
          }
          return dim;
        });
      }

      const where = groupBy ? buildGlobalWhere(filtersOverride ?? globalFilterValues) : undefined;
      
      const req: MetricQueryRequest = {
        metric: card.metricId,
        group_by: groupBy,
        where,
        start_time: start,
        end_time: end,
        order: [],
        limit: 500
      };
      const resp = await metricsService.getMetricValue(req);
      const data = transformMetricFlowToChartData(resp);
      return { id: card.id, type: 'chart', data, rawData: resp };
    } catch (e) {
      console.warn(`Card ${card.id}: failed to load data.`, e);
      return null;
    }
  }, [globalTimeRange, globalCustomDateRange, globalFilterValues]);

  const loadCardDataFor = useCallback(async (card: BIChartCard, filtersOverride?: Record<string, string>, timeRangeOverride?: string) => {
    const cached = cardQueryCache.current.get(card.id);
    if (cached && Date.now() - cached.timestamp < CARD_QUERY_CACHE_TTL && !filtersOverride) {
      setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: cached.result.data, rawData: cached.result.rawData as MetricFlowResponse } }));
      if (cached.result.type === 'alert' && cached.result.status) {
        setAlertStatusMap(prev => ({ ...prev, [card.id]: cached.result.status! }));
      }
      return;
    }
    if (cardInFlightRequests.current.has(card.id)) return;
    const requestId = Date.now();
    cardInFlightRequests.current.set(card.id, requestId);
    try {
      const result = await fetchCardData(card, filtersOverride, timeRangeOverride);
      if (cardInFlightRequests.current.get(card.id) !== requestId) return;
      if (!result) return;

      cardQueryCache.current.set(card.id, { result, timestamp: Date.now() });

      if (result.type === 'alert') {
        setCardDataMap(prev => ({ ...prev, [result.id]: { chartData: result.data, rawData: result.rawData } }));
        if (result.status) {
          setAlertStatusMap(prev => ({ ...prev, [result.id]: result.status! }));
        }
      } else {
        setCardDataMap(prev => ({ ...prev, [result.id]: { chartData: result.data, rawData: result.rawData as MetricFlowResponse } }));
      }
    } finally {
      cardInFlightRequests.current.delete(card.id);
    }
  }, [fetchCardData]);

  const applyCardResults = useCallback((results: Awaited<ReturnType<typeof fetchCardData>>[]) => {
    setCardDataMap(prev => {
      const next = { ...prev };
      results.forEach(result => {
        if (!result) return;
        next[result.id] = { chartData: result.data, rawData: result.rawData as MetricFlowResponse };
      });
      return next;
    });

    setAlertStatusMap(prev => {
      const next = { ...prev };
      let hasUpdates = false;
      results.forEach(result => {
        if (result && result.type === 'alert' && result.status) {
          next[result.id] = result.status;
          hasUpdates = true;
        }
      });
      return hasUpdates ? next : prev;
    });
  }, []);

  const refreshCardsWithContext = useCallback(async (
    cardsToRefresh: BIChartCard[],
    options?: {
      filtersOverride?: Record<string, string>;
      timeRangeOverride?: string;
    }
  ) => {
    const requestId = ++boardRefreshRequestRef.current;
    const results = await Promise.all(
      cardsToRefresh.map(card => fetchCardData(card, options?.filtersOverride, options?.timeRangeOverride))
    );
    if (requestId !== boardRefreshRequestRef.current) return;
    applyCardResults(results);
  }, [applyCardResults, fetchCardData]);

  const confirmAddAlert = useCallback(() => {
     if (!alertRuleId) return;
     const rule = dialogRules.find(r => r.id === alertRuleId);
     if (!rule) return;
     
     const metricId = rule.conditions?.[0]?.metricId || '';
     const metricName = rule.conditions?.[0]?.metricName || metricId;

     const rangeStr = toTimeRangeValue(alertTimeRange, alertCustomDateRange);
     if (rangeStr === null) {
       toast({ title: 'Invalid Date Range', description: 'Please select start and end dates' });
       return;
     }

     const newCard: BIChartCard = {
        id: `card_${Date.now()}`,
        title: rule.name || `${metricName} · Alert`,
        metricId: metricId,
        chartType: 'alert',
        size: 'md',
        selection: { dimensions: [], timeRange: rangeStr },
        alert: rule
     };

     setCards(prev => [...prev, newCard]);
     toast({ title: 'Added', description: 'Alert card added to dashboard' });
     setAddAlertOpen(false);
     setAlertRuleId('');
     setAlertTimeRange('Past 30 days');
  }, [alertRuleId, dialogRules, alertTimeRange, alertCustomDateRange, toast]);

  const refreshData = useCallback(async () => {
    setIsBoardRefreshing(true);
    toast({ title: 'Refreshing', description: 'Refreshing all cards...' });
    await refreshCardsWithContext(cards);
    setIsBoardRefreshing(false);
  }, [cards, refreshCardsWithContext, toast]);

  const selectedMetric: BIMetric | null = useMemo(() => {
    const m = chartConfig.metricDef;
    if (!m) return null;
    const unit = (m.unit || '').toLowerCase();
    const kind: 'rate' | 'amount' | 'count' = m.type === 'ratio' || unit.includes('%')
      ? 'rate'
      : (unit.includes('hkd') || unit.includes('usd') || unit.includes('¥') || unit.includes('$')) ? 'amount' : 'count';
    const dims = availableDims;
    return {
      id: m.id ?? m.name,
      name:  m.name,
      description: m.description ?? '',
      categoryId: m.categoryId ?? '',
      kind,
      dimensions: dims
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
  }, [
    selectedMetric,
    chartConfig.dimensions,
    chartConfig.timeRange,
    chartConfig.customDateRange,
    chartConfig.timeGranularity,
    chartConfig.limit,
    hasSelectedTimeDimension
  ]);

  const commonFilterSource = useMemo(() => cards.map(card => ({
    metricId: card.metricId,
    dimensions: Array.isArray(card.selection?.dimensions) ? card.selection.dimensions : []
  })), [cards]);





  useEffect(() => {
    if (activeSection !== 'dashboard') return;
    if (!pendingScrollToDashboard) return;
    dashboardViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScrollToDashboard(false);
  }, [activeSection, pendingScrollToDashboard]);

  useEffect(() => {
    let alive = true;
    const loadCommon = async () => {
      const selectedDimSets = commonFilterSource
        .map(c => (Array.isArray(c.dimensions) ? c.dimensions : []))
        .map(dims => dims.map(d => (d || '').trim()).filter(d => d.length > 0))
        .filter(dims => dims.length > 0)
        .map(dims => new Set<string>(dims));

      if (selectedDimSets.length === 0) {
        if (alive) {
          setCommonFilterDimensions([]);
          setGlobalFilterValues({});
        }
        return;
      }

      let commonKeys = new Set<string>(Array.from(selectedDimSets[0]));
      for (const s of selectedDimSets.slice(1)) {
        commonKeys = new Set(Array.from(commonKeys).filter(k => s.has(k)));
      }

      if (commonKeys.size === 0) {
        if (alive) {
          setCommonFilterDimensions([]);
          setGlobalFilterValues({});
        }
        return;
      }

      const metricIds = Array.from(
        new Set(
          commonFilterSource
            .map(c => (c.metricId || '').trim())
            .filter(id => id.length > 0)
        )
      );

      if (metricIds.length === 0) {
        if (alive) {
          setCommonFilterDimensions([]);
          setGlobalFilterValues({});
        }
        return;
      }

      try {
        const missingIds = metricIds.filter(id => !metricDimsCache.current.has(id));
        if (missingIds.length > 0) {
          const responses = await Promise.all(missingIds.map(id => findDimensionsByMetric(id)));
          responses.forEach((r, i) => {
            const dims = Array.isArray(r?.dimensions) ? r.dimensions : [];
            metricDimsCache.current.set(missingIds[i], dims);
          });
        }

        const maps = metricIds.map(id => {
          const dims = metricDimsCache.current.get(id) || [];
          return new Map(dims.map(d => [toDimKey(d), d] as const));
        });

        if (maps.length === 0) {
          if (alive) setCommonFilterDimensions([]);
          return;
        }

        const dimByKey = new Map<string, MetricDimension>();
        for (const m of maps) {
          for (const k of Array.from(commonKeys)) {
            if (!dimByKey.has(k) && m.has(k)) {
              const d = m.get(k);
              if (d) dimByKey.set(k, d);
            }
          }
        }

        const commonDims = Array.from(commonKeys)
          .map(k => dimByKey.get(k) ?? ({ name: k, qualified_name: k } as MetricDimension))
          .filter((d): d is MetricDimension => Boolean(d))
          .filter(d => inferType(d) !== 'TIME')
          .sort((a, b) => {
            const ia = typeof a.importance === 'number' ? a.importance : 0;
            const ib = typeof b.importance === 'number' ? b.importance : 0;
            if (ib !== ia) return ib - ia;
            return (a.name || '').localeCompare(b.name || '');
          });

        if (!alive) return;
        setCommonFilterDimensions(commonDims);
        setGlobalFilterValues(prev => {
          const next: Record<string, string> = {};
          for (const k of Array.from(commonKeys)) {
            if (typeof prev[k] === 'string') next[k] = prev[k];
          }
          return next;
        });
      } catch (e) {
        if (!alive) return;
        setCommonFilterDimensions([]);
      }
    };

    void loadCommon();
    return () => {
      alive = false;
    };
  }, [commonFilterSource]);



  // init categories
  useEffect(() => {
    getRealCategories().then((list: Category[]) => setCategories(list.map(c => ({ id: c.id, name: c.name }))));
  }, []);

  // load metrics for selection: fetch all, optionally filter by search/category
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
    return () => { 
      alive = false; 
      clearTimeout(timer);
    };
  }, [search, categoryId, metricBuilderOpen, metricsRefreshNonce]);

  useEffect(() => {
    const onFocus = () => {
      if (metricBuilderOpen) {
        setMetricsRefreshNonce(v => v + 1);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [metricBuilderOpen]);

  useEffect(() => {
    return () => {
      if (globalFilterDebounceRef.current) {
        window.clearTimeout(globalFilterDebounceRef.current);
      }
    };
  }, []);

  const handleMetricBuilderOpenChange = useCallback((open: boolean) => {
    setMetricBuilderOpen(open);
  }, []);

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

  const handleSelectedChartTypeChange = useCallback((value: BIChartType) => {
    setChartConfig(prev => ({ ...prev, chartType: value }));
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setChartConfig(prev => ({ ...prev, limit: value }));
  }, []);

  const openAddAlertDialog = useCallback(() => {
    setAddAlertOpen(true);
  }, []);

  const openSubscriptionDialog = useCallback(() => {
    setSubscriptionOpen(true);
  }, []);



  // Preview update with real data and data-driven chart type
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
    chartConfig.timeRange,
    chartConfig.customDateRange,
    chartConfig.timeGranularity,
    chartConfig.chartType,
    chartConfig.dimensions,
    hasSelectedTimeDimension,
    previewFallbackType
  ]);

  // templates list
  useEffect(() => {
    listAnalyses()
      .then(list => {
        if (Array.isArray(list)) {
          setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description, isTemplate: i.isTemplate })));
        } else {
          setTemplates([]);
        }
      })
      .catch(e => {
        console.error("Failed to load templates", e);
        setTemplates([]);
      });
  }, []);

  // Load dimensions by metric via MCP when metric changes
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
          : (() => {
              return [];
            })();
        const nextDims = dims.length > 0
          ? dims
          : await findDimensionsByMetric(chartConfig.metricDef.name).then(resp => {
              const resolved = Array.isArray(resp?.dimensions) ? resp.dimensions : [];
              metricDimsCache.current.set(cacheKey, resolved);
              return resolved;
            });
        setAvailableDimsDetailed(nextDims);
        // initialize selected type to the first inferred type (prefer CATEGORICAL/TIME)
        const types = Array.from(new Set(nextDims.map(inferType)));
        setSelectedDimType(types[0] ?? 'CATEGORICAL');
      } catch (e) {
        console.warn('Failed to load metric dimensions, defaulting to empty.', e);
        setAvailableDimsDetailed([]);
        setSelectedDimType('');
      }
      // reset selected dimensions on metric change to avoid invalid selections
      setChartConfig(prev => ({ ...prev, dimensions: [] }));
    };
    loadDims();
  }, [chartConfig.metricDef]);

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
      return ib - ia; // desc by importance
    });
    if (showTopOnly) return sorted.slice(0, 24); // show top 24 by default
    return sorted;
  }, [availableDimsDetailed, selectedDimType, dimSearch, showTopOnly]);

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

    // Prefer data-driven type; if no preview data yet, infer from selected dimensions
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
      // Use metric name for backend metricFlow API compatibility
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

    setCards(prev => [...prev, newCard]);
    toast({ title: 'Added', description: 'Chart has been added to the analysis board' });
    setActiveSection('dashboard');
    setMetricBuilderOpen(false);
  }, [selectedMetric, chartConfig, availableDimsDetailed, previewState, hasSelectedTimeDimension, toast]);

  // drag-and-drop reorder
  const onDragStart = useCallback((index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', String(index));
  }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);
  const onDrop = useCallback((index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIndex)) return;
    setCards(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
  }, []);

  const resizeCard = useCallback((index: number, size: BICardSize) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, size } : c));
  }, []);
  const updateCard = useCallback((index: number, updatedCard: BIChartCard) => {
    setCards(prev => prev.map((c, i) => i === index ? updatedCard : c));
    // Clear data for this card to force reload
    setCardDataMap(prev => {
      const next = { ...prev };
      delete next[updatedCard.id];
      return next;
    });
  }, []);
  const removeCard = useCallback((index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGlobalFilterChange = useCallback((dimensionKey: string, value: string) => {
    const next = { ...globalFilterValues, [dimensionKey]: value };
    setGlobalFilterValues(next);

    if (globalFilterDebounceRef.current) {
      window.clearTimeout(globalFilterDebounceRef.current);
    }

    globalFilterDebounceRef.current = window.setTimeout(async () => {
      setIsBoardRefreshing(true);
      await refreshCardsWithContext(cards, { filtersOverride: next });
      setIsBoardRefreshing(false);
    }, 220);
  }, [cards, globalFilterValues, refreshCardsWithContext]);

  const handleGlobalTimeRangeChange = useCallback(async (range: string) => {
    setGlobalTimeRange(range);
    setIsBoardRefreshing(true);

    // Sync to cards if not "Per Card" and not "Custom" (Custom is handled in date change)
    let nextCards = cards;
    if (range !== GLOBAL_TIME_RANGE_PER_CARD && range !== 'Custom') {
      nextCards = cards.map(c => ({
        ...c,
        selection: { ...c.selection, timeRange: range }
      }));
      setCards(nextCards);
    } else if (range === 'Custom' && globalCustomDateRange?.from && globalCustomDateRange?.to) {
       // If switching to Custom and we already have a range, sync it
       const customStr = `Custom:${format(globalCustomDateRange.from, 'yyyy-MM-dd')}:${format(globalCustomDateRange.to, 'yyyy-MM-dd')}`;
       nextCards = cards.map(c => ({
        ...c,
        selection: { ...c.selection, timeRange: customStr }
      }));
       setCards(nextCards);
    }

    await refreshCardsWithContext(nextCards, {
      filtersOverride: globalFilterValues,
      timeRangeOverride: range === GLOBAL_TIME_RANGE_PER_CARD ? undefined : range
    });
    setIsBoardRefreshing(false);
  }, [cards, globalCustomDateRange, globalFilterValues, refreshCardsWithContext]);

  const handleGlobalCustomDateRangeChange = useCallback(async (range: DateRange) => {
    setGlobalCustomDateRange(range);
    if (globalTimeRange !== 'Custom') return;

    if (!range?.from || !range?.to) return;
    const override = `Custom:${format(range.from, 'yyyy-MM-dd')}:${format(range.to, 'yyyy-MM-dd')}`;

    // Sync to cards
    const nextCards = cards.map(c => ({
      ...c,
      selection: { ...c.selection, timeRange: override }
    }));
    setCards(nextCards);

    setIsBoardRefreshing(true);
    await refreshCardsWithContext(nextCards, { filtersOverride: globalFilterValues, timeRangeOverride: override });
    setIsBoardRefreshing(false);
  }, [cards, globalFilterValues, globalTimeRange, refreshCardsWithContext]);

  const clearGlobalFilters = useCallback(async () => {
    const next: Record<string, string> = {};
    setGlobalFilterValues(next);
    setGlobalTimeRange(GLOBAL_TIME_RANGE_PER_CARD);
    setGlobalCustomDateRange(undefined);
    setIsBoardRefreshing(true);
    await refreshCardsWithContext(cards, { filtersOverride: next });
    setIsBoardRefreshing(false);
  }, [cards, refreshCardsWithContext]);

  // Load card data when cards change (only for missing ones, skip in-flight)
  useEffect(() => {
    cards.forEach(c => {
      if (cardDataMap[c.id]) return;
      if (cardInFlightRequests.current.has(c.id)) return;
      void loadCardDataFor(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const resetBoard = () => {
    setCards([]);
    setCardDataMap({});
    setCurrentAnalysisId(null);
    setSaveName('');
    setSaveDesc('');
    localStorage.removeItem('watchmen_bi_last_analysis_id');
    toast({ title: 'Board Reset', description: 'Started a new analysis' });
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast({ title: 'Enter analysis name', description: 'Name cannot be empty' });
      return;
    }

    if (currentAnalysisId) {
      await updateAnalysis({ id: currentAnalysisId, userId: user.userId, name: saveName.trim(), description: saveDesc.trim(), cards });
      toast({ title: 'Updated', description: 'Analysis board has been updated' });
    } else {
      const record = await saveAnalysis({ id: "", name: saveName.trim(), description: saveDesc.trim(), cards, userId: user.userId });
      setCurrentAnalysisId(record.id);
      toast({ title: 'Saved', description: 'Analysis board has been saved' });
    }

    setSaveOpen(false);
    // If we updated, we might want to keep the name/desc as is. If we saved new, we also keep it.
    // Only clear if we want to force reset, but typically after save we keep working.
    // But if we want to enforce "Save As" behavior for next save, we might need to be careful.
    // For now, let's NOT clear saveName/saveDesc so user can continue editing.
    
    listAnalyses().then(list => setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description,  isTemplate: i.isTemplate }))));
  };

  const handleSaveAsNew = async () => {
    if (!saveName.trim()) {
      toast({ title: 'Enter analysis name', description: 'Name cannot be empty' });
      return;
    }
    const record = await saveAnalysis({ id: "", name: saveName.trim(), description: saveDesc.trim(), cards, userId: user.userId });
    setCurrentAnalysisId(record.id);
    setSaveOpen(false);
    listAnalyses().then(list => setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description, isTemplate: i.isTemplate }))));
    toast({ title: 'Saved', description: 'Analysis saved as new copy' });
  };

  const loadTemplate = useCallback(async (id: string) => {
    const tpl = await getAnalysis(id);
    if (!tpl) return;
    setCardDataMap({});
    setCards(tpl.cards);
    if (tpl.isTemplate) {
      setCurrentAnalysisId(null);
      localStorage.removeItem('watchmen_bi_last_analysis_id');
      toast({ title: 'Template loaded', description: `Loaded "${tpl.name}" as a new board` });
    } else {
      setCurrentAnalysisId(tpl.id);
      localStorage.setItem('watchmen_bi_last_analysis_id', tpl.id);
      toast({ title: 'Analysis loaded', description: `Board switched to "${tpl.name}"` });
    }
    setSaveName(tpl.name);
    setSaveDesc(tpl.description || '');
    setActiveSection('dashboard');
    setPendingScrollToDashboard(true);
  }, [toast]);
  
  // Load last visited analysis on mount
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    
    const lastId = localStorage.getItem('watchmen_bi_last_analysis_id');
    if (lastId) {
      void loadTemplate(lastId);
    }
  }, [loadTemplate]);

  const deleteTemplate = async (id: string) => {
    await deleteAnalysis(id);
    listAnalyses().then(list => setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description,  isTemplate: i.isTemplate }))));
    toast({ title: 'Deleted', description: 'Analysis deleted' });
  };

  const toggleTemplate = async (template: typeof templates[0]) => {
    const newStatus = !template.isTemplate;
    
    // Directly update local state
    setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, isTemplate: newStatus } : t));

    // Directly call update method
    await updateAnalysisTemplate({ id: template.id, isTemplate: newStatus });
    
    toast({ title: 'Updated', description: `Analysis ${newStatus ? 'set as template' : 'removed from templates'}` });
  };

  const { token } = useAuth();

  const copyShareLink = () => {
    if (!currentAnalysisId) return;
    let url = `${window.location.origin}/share/analysis/${currentAnalysisId}`;
    if (token) {
      url += `?token=${token}`;
    }
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'Share link copied to clipboard' });
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await globalAlertService.acknowledgeAlert(alertId);
      
      // Update local state to reflect acknowledgment
      setAlertStatusMap(prev => {
        const next = { ...prev };
        // Find which card has this alert status
        const cardId = Object.keys(next).find(k => next[k].id === alertId);
        if (cardId && next[cardId]) {
           next[cardId] = {
             ...next[cardId],
             acknowledged: true,
             acknowledgedBy: user?.name || 'User',
             acknowledgedAt: new Date().toISOString()
           };
        }
        return next;
      });
      
      toast({ title: 'Acknowledged', description: 'Alert has been acknowledged' });
    } catch (e) {
      console.error('Failed to acknowledge alert', e);
      toast({ title: 'Error', description: 'Failed to acknowledge alert', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />

        <main className="container py-6 space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <LayoutDashboard className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Metrics Analysis</h1>
                <p className="text-sm text-muted-foreground">Build multi-dimensional metrics, smart chart recommendations, and a card dashboard</p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <Button variant="outline" onClick={() => setMetricBuilderOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Metric
              </Button>
              <Button variant="ghost" onClick={resetBoard} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button variant="outline" onClick={() => setShareOpen(true)} className="gap-2" disabled={!currentAnalysisId}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="default" onClick={() => setSaveOpen(true)} className="gap-2">
                <Save className="h-4 w-4" />
                Save Analysis
              </Button>
            </div>
          </div>

          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as 'dashboard' | 'saved')} className="w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TabsList className="w-fit">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{cards.length} cards</Badge>
                <Badge variant="outline" className="text-xs">{commonFilterDimensions.length} global dims</Badge>
              </div>
            </div>

            <TabsContent value="dashboard" className="mt-4">
              <div ref={dashboardViewRef}>
                <AnalysisBoard
                  cards={cards}
                  cardDataMap={cardDataMap}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onResize={resizeCard}
                  onRemove={removeCard}
                  onUpdate={updateCard}
                  onAddAlert={openAddAlertDialog}
                  onSubscription={currentAnalysisId ? openSubscriptionDialog : undefined}
                  alertStatusMap={alertStatusMap}
                  onAcknowledge={handleAcknowledge}
                  globalFilterDimensions={commonFilterDimensions}
                  globalFilterValues={globalFilterValues}
                  onGlobalFilterChange={handleGlobalFilterChange}
                  onClearGlobalFilters={clearGlobalFilters}
                  globalTimeRange={globalTimeRange}
                  globalCustomDateRange={globalCustomDateRange}
                  onGlobalTimeRangeChange={handleGlobalTimeRangeChange}
                  onGlobalCustomDateRangeChange={handleGlobalCustomDateRangeChange}
                  onRefresh={refreshData}
                  isRefreshing={isBoardRefreshing}
                />
              </div>
            </TabsContent>

            <TabsContent value="saved" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Saved Analyses</h2>
                <Button variant="outline" onClick={() => setSaveOpen(true)} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Current
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                  <p>No saved analyses yet</p>
                  <p className="text-sm">Save your current board to see it here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(t => (
                    <Card key={t.id} className="group hover:shadow-md transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base font-medium truncate" title={t.name}>{t.name}</CardTitle>
                          {t.isTemplate && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Template</Badge>}
                        </div>
                        <CardDescription className="text-xs line-clamp-2 min-h-[2.5em]">
                          {t.description || 'No description provided'}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="pt-0 flex justify-between gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => loadTemplate(t.id)}>
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={t.isTemplate ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:text-primary"}
                          title={t.isTemplate ? "Unset as Template" : "Set as Template"}
                          onClick={() => toggleTemplate(t)}
                        >
                          <LayoutTemplate className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <MetricBuilderSheet
            open={metricBuilderOpen}
            onOpenChange={handleMetricBuilderOpenChange}
            search={search}
            onSearchChange={setSearch}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            categories={categories}
            metricsLoading={metricsLoading}
            metricsList={metricsList}
            selectedMetricId={chartConfig.metricId}
            onSelectMetric={handleMetricSelect}
            selectedMetric={selectedMetric}
            availableDimsDetailed={availableDimsDetailed}
            selectedDimType={selectedDimType}
            onSelectedDimTypeChange={setSelectedDimType}
            dimSearch={dimSearch}
            onDimSearchChange={setDimSearch}
            filteredDims={filteredDims}
            selectedDims={chartConfig.dimensions}
            onToggleDim={toggleDim}
            timeRange={chartConfig.timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            timeGranularity={chartConfig.timeGranularity}
            onTimeGranularityChange={handleTimeGranularityChange}
            customDateRange={chartConfig.customDateRange}
            onCustomDateRangeChange={handleCustomDateRangeChange}
            selectedChartType={chartConfig.chartType}
            onSelectedChartTypeChange={handleSelectedChartTypeChange}
            limit={chartConfig.limit}
            onLimitChange={handleLimitChange}
            previewType={previewState.type}
            previewData={previewState.data}
            previewRawData={previewState.rawData}
            onAddToDashboard={addCardToBoard}
          />

          <AddAlertCardDialog
            open={addAlertOpen}
            onOpenChange={setAddAlertOpen}
            alertRuleId={alertRuleId}
            onAlertRuleIdChange={setAlertRuleId}
            dialogRules={dialogRules}
            alertTimeRange={alertTimeRange}
            onAlertTimeRangeChange={setAlertTimeRange}
            alertCustomDateRange={alertCustomDateRange}
            onAlertCustomDateRangeChange={setAlertCustomDateRange}
            onConfirm={confirmAddAlert}
          />

          <SaveAnalysisDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            currentAnalysisId={currentAnalysisId}
            saveName={saveName}
            onSaveNameChange={setSaveName}
            saveDesc={saveDesc}
            onSaveDescChange={setSaveDesc}
            onSave={handleSave}
            onSaveAsNew={handleSaveAsNew}
          />

          <ShareAnalysisDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            currentAnalysisId={currentAnalysisId}
            onCopyLink={copyShareLink}
            token={token || undefined}
          />

          <SubscriptionModal
            open={subscriptionOpen}
            onOpenChange={setSubscriptionOpen}
            analysisId={currentAnalysisId || ''}
          />
        </main>
      </div>
    </div>
  );
};



type AddAlertCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertRuleId: string;
  onAlertRuleIdChange: (id: string) => void;
  dialogRules: GlobalAlertRule[];
  alertTimeRange: string;
  onAlertTimeRangeChange: (value: string) => void;
  alertCustomDateRange: DateRange | undefined;
  onAlertCustomDateRangeChange: (range: DateRange | undefined) => void;
  onConfirm: () => void;
};

function AddAlertCardDialog({
  open,
  onOpenChange,
  alertRuleId,
  onAlertRuleIdChange,
  dialogRules,
  alertTimeRange,
  onAlertTimeRangeChange,
  alertCustomDateRange,
  onAlertCustomDateRangeChange,
  onConfirm
}: AddAlertCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Alert Card</DialogTitle>
          <DialogDescription>
            Select an alert rule to add to the dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Alert Rule</Label>
            <Select value={alertRuleId} onValueChange={onAlertRuleIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select rule..." />
              </SelectTrigger>
              <SelectContent>
                {dialogRules.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.priority})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select value={alertTimeRange} onValueChange={onAlertTimeRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Past 7 days">Past 7 days</SelectItem>
                <SelectItem value="Past 30 days">Past 30 days</SelectItem>
                <SelectItem value="Past 90 days">Past 90 days</SelectItem>
                <SelectItem value="Past year">Past year</SelectItem>
                <SelectItem value="Custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {alertTimeRange === 'Custom' && (
              <div className="pt-1 animate-in fade-in slide-in-from-top-1">
                <DatePickerWithRange
                  date={alertCustomDateRange}
                  onSelect={onAlertCustomDateRangeChange}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={!alertRuleId}>Add Alert</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SaveAnalysisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAnalysisId: string | null;
  saveName: string;
  onSaveNameChange: (value: string) => void;
  saveDesc: string;
  onSaveDescChange: (value: string) => void;
  onSave: () => void;
  onSaveAsNew: () => void;
};

function SaveAnalysisDialog({
  open,
  onOpenChange,
  currentAnalysisId,
  saveName,
  onSaveNameChange,
  saveDesc,
  onSaveDescChange,
  onSave,
  onSaveAsNew
}: SaveAnalysisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentAnalysisId ? 'Update Analysis' : 'Save New Analysis'}</DialogTitle>
          <DialogDescription>
            {currentAnalysisId ? 'Update the existing analysis or save as a new copy' : 'Save the current board as a reusable template'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <Input value={saveName} onChange={(e) => onSaveNameChange(e.target.value)} placeholder="Enter analysis name" />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <Input value={saveDesc} onChange={(e) => onSaveDescChange(e.target.value)} placeholder="Optional: brief description of purpose" />
          </div>
        </div>
        <DialogFooter>
          {currentAnalysisId && (
            <Button variant="outline" onClick={onSaveAsNew}>
              Save as New
            </Button>
          )}
          <Button onClick={onSave}>{currentAnalysisId ? 'Update' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ShareAnalysisDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAnalysisId: string | null;
  onCopyLink: () => void;
  token?: string;
};

function ShareAnalysisDialog({
  open,
  onOpenChange,
  currentAnalysisId,
  onCopyLink,
  token,
}: ShareAnalysisDialogProps) {
  const shareLink = useMemo(() => {
    if (!currentAnalysisId) return '';
    let url = `${window.location.origin}/share/analysis/${currentAnalysisId}`;
    if (token) {
      url += `?token=${token}`;
    }
    return url;
  }, [currentAnalysisId, token]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Analysis</DialogTitle>
          <DialogDescription>
            Share this analysis with external users. {token ? 'The link includes your current authentication token.' : 'Please log in to generate a secure link.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Input value={shareLink} readOnly />
            <Button size="icon" onClick={onCopyLink} disabled={!shareLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => window.open(shareLink, '_blank')} disabled={!shareLink}>Open Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BIAnalysisPage;
