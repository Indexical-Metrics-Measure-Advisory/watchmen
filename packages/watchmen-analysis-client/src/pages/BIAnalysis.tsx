import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  LayoutDashboard, 
  Plus, 
  Save, 
  Search,
  Filter,
  ArrowRight,
  Loader2,
  Trash2,
  LayoutTemplate,
  RotateCcw,
  Share2,
  Copy
} from 'lucide-react';
import { ChartCard } from '@/components/bi/ChartCard';
import { AnalysisBoard } from '@/components/bi/AnalysisBoard';
import { BIChartCard, BICardSize, BIMetric, BIChartType, GlobalAlertRule } from '@/model/biAnalysis';
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
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [selectedMetricDef, setSelectedMetricDef] = useState<MetricDefinition | null>(null);
  const [metricsList, setMetricsList] = useState<MetricDefinition[]>([]);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const [availableDims, setAvailableDims] = useState<string[]>([]);
  const [availableDimsDetailed, setAvailableDimsDetailed] = useState<MetricDimension[]>([]);
  const [selectedDimType, setSelectedDimType] = useState<string>('');
  const [selectedDims, setSelectedDims] = useState<string[]>([]);
  const [dimSearch, setDimSearch] = useState<string>('');
  const [showTopOnly] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>('Past 30 days');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // preview
  const [previewData, setPreviewData] = useState<unknown[]>([]);
  const [previewRawData, setPreviewRawData] = useState<MetricFlowResponse | null>(null);
  const [previewType, setPreviewType] = useState<BIChartType>('line');

  // Alert Configuration State (Removed)
  const [addAlertOpen, setAddAlertOpen] = useState(false);
  const [alertRuleId, setAlertRuleId] = useState('');
  const [dialogRules, setDialogRules] = useState<GlobalAlertRule[]>([]);
  const [alertTimeRange, setAlertTimeRange] = useState<string>('Past 30 days');
  const [alertCustomDateRange, setAlertCustomDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

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

  const confirmAddAlert = () => {
     if (!alertRuleId) return;
     const rule = dialogRules.find(r => r.id === alertRuleId);
     if (!rule) return;
     
     const metricId = rule.conditions?.[0]?.metricId || '';
     const metricName = rule.conditions?.[0]?.metricName || metricId;

     let rangeStr = alertTimeRange;
     if (alertTimeRange === 'Custom' && alertCustomDateRange?.from && alertCustomDateRange?.to) {
         rangeStr = `Custom:${format(alertCustomDateRange.from, 'yyyy-MM-dd')}:${format(alertCustomDateRange.to, 'yyyy-MM-dd')}`;
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

     console.log('newCard:', newCard);
     setCards(prev => [...prev, newCard]);
     toast({ title: 'Added', description: 'Alert card added to dashboard' });
     void loadCardDataFor(newCard);
     setAddAlertOpen(false);
     setAlertRuleId('');
     setAlertTimeRange('Past 30 days');
  };

  const selectedMetric: BIMetric | null = useMemo(() => {
    const m = selectedMetricDef;
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
  }, [selectedMetricDef, availableDims]);



  // board
  const [cards, setCards] = useState<BIChartCard[]>([]);
  const [cardDataMap, setCardDataMap] = useState<Record<string, { chartData: unknown[]; rawData: MetricFlowResponse | null }>>({});
  const [alertStatusMap, setAlertStatusMap] = useState<Record<string, AlertStatus>>({});
  const [commonFilterDimensions, setCommonFilterDimensions] = useState<MetricDimension[]>([]);
  const [globalFilterValues, setGlobalFilterValues] = useState<Record<string, string>>({});

  // saving
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description?: string; isTemplate?: boolean }>>([]);
  const [metricBuilderOpen, setMetricBuilderOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'saved'>('dashboard');
  const dashboardViewRef = useRef<HTMLDivElement | null>(null);
  const [pendingScrollToDashboard, setPendingScrollToDashboard] = useState(false);

  useEffect(() => {
    if (activeSection !== 'dashboard') return;
    if (!pendingScrollToDashboard) return;
    dashboardViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScrollToDashboard(false);
  }, [activeSection, pendingScrollToDashboard]);

  // Only two user-facing types: CATEGORICAL and TIME
  const inferType = (d: MetricDimension): 'CATEGORICAL' | 'TIME' => {
    const raw = (d.dimensionType ?? '').toString().toUpperCase();
    if (raw === 'TIME') return 'TIME';
    // Prefer explicit backend type, but allow overriding via common time keywords
    const s = `${d.description ?? ''} ${d.qualified_name ?? ''} ${d.name ?? ''}`.toLowerCase();
    const timeHints = ['date', 'time', 'month', 'year', 'quarter', 'week', 'day', 'hour', 'period', 'window', 'timestamp', 'datetime', 'created_at', 'updated_at'];
    if (timeHints.some(h => s.includes(h))) return 'TIME';
    return 'CATEGORICAL';
  };

  useEffect(() => {
    let alive = true;
    const toDimKey = (d: MetricDimension) => d.qualified_name || d.name;
    const loadCommon = async () => {
      const selectedDimSets = cards
        .map(c => (Array.isArray(c.selection?.dimensions) ? c.selection.dimensions : []))
        .map(dims => dims.map(d => (d || '').trim()).filter(d => d.length > 0))
        .filter(dims => dims.length > 0)
        .map(dims => new Set(dims));

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
          cards
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
        const responses = await Promise.all(metricIds.map(id => findDimensionsByMetric(id)));
        const maps = responses.map(r => {
          const dims = Array.isArray(r?.dimensions) ? r.dimensions : [];
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
  }, [cards]);

  // Map UI time range to ISO date bounds (YYYY-MM-DD)
  const timeRangeToBounds = (range: string): { start: string; end: string } => {
    // Handle Custom range string format "Custom:YYYY-MM-DD:YYYY-MM-DD"
    if (range.startsWith('Custom:')) {
      const parts = range.split(':');
      if (parts.length === 3) {
         return { start: parts[1], end: parts[2] };
      }
    }
    
    // Handle "Custom" literal (from UI state)
    if (range === 'Custom') {
        if (customDateRange?.from && customDateRange?.to) {
            return { 
                start: format(customDateRange.from, 'yyyy-MM-dd'), 
                end: format(customDateRange.to, 'yyyy-MM-dd') 
            };
        }
        // Fallback if custom range is invalid
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
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

  const buildGlobalWhere = (filters: Record<string, string>): string | undefined => {
    const parts = Object.entries(filters)
      .map(([k, v]) => [k.trim(), v.trim()] as const)
      .filter(([k, v]) => k.length > 0 && v.length > 0)
      .map(([k, v]) => {
        const escaped = v.replace(/'/g, "''");
        return `${k} = '${escaped}'`;
      });
    return parts.length > 0 ? parts.join(' AND ') : undefined;
  };

  // Convert MetricFlowResponse to chart-friendly data
  const transformMetricFlowToChartData = (resp: MetricFlowResponse): unknown[] => {
    if (!resp || !Array.isArray(resp.column_names) || !Array.isArray(resp.data)) return [];
    const cols = resp.column_names;
    const valueIdx = Math.max(cols.lastIndexOf('value'), cols.length - 1);
    const dimIdxs = cols.map((_, i) => i).filter(i => i !== valueIdx);
    const timeKeywords = ['date', 'day', 'month', 'week', 'hour', 'time', 'timestamp', 'datetime', 'created_at', 'updated_at'];
    const timeIdx = dimIdxs.find(i => timeKeywords.some(k => String(cols[i] ?? '').toLowerCase().includes(k)));

    const fmt = (v: unknown) => (v === null || v === undefined) ? 'Null' : String(v);

    // Time series: aggregate by time only (sum values across other dims)
    if (typeof timeIdx === 'number') {
      const acc = new Map<string, number>();
      for (const row of resp.data) {
        const t = fmt(row[timeIdx]);
        const v = Number(row[valueIdx] ?? 0);
        acc.set(t, (acc.get(t) ?? 0) + v);
      }
      // Sort by time ascending when parsable, otherwise keep insertion order
      const entries = Array.from(acc.entries());
      const parsed = entries.map(([t, v]) => ({ t, v, d: Date.parse(t) }));
      parsed.sort((a, b) => (Number.isFinite(a.d) && Number.isFinite(b.d)) ? a.d - b.d : a.t.localeCompare(b.t));
      return parsed.map(p => ({ date: p.t, value: p.v }));
    }

    // New logic: If 2+ dims (and no time), pivot for grouped bar
    if (dimIdxs.length >= 2) {
      const pivotMap = new Map<string, Record<string, unknown>>();
      for (const row of resp.data) {
        const name = fmt(row[dimIdxs[0]]);
        const group = fmt(row[dimIdxs[1]]);
        const val = Number(row[valueIdx] ?? 0);
        
        if (!pivotMap.has(name)) {
          pivotMap.set(name, { name });
        }
        const record = pivotMap.get(name)!;
        const cur = record[group];
        record[group] = (typeof cur === 'number' ? cur : 0) + val;
      }
      return Array.from(pivotMap.values());
    }

    // Categorical: combine dims into one name label
    return resp.data.map(row => {
      const nameParts = dimIdxs.map(i => fmt(row[i])).filter(s => s.length > 0);
      const name = nameParts.length > 0 ? nameParts.join(' · ') : 'Total';
      const value = Number(row[valueIdx] ?? 0);
      return { name, value };
    });
  };

  // Decide chart type based on data or selected dimensions
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

  // Fetch and cache card data
  const loadCardDataFor = async (card: BIChartCard, filtersOverride?: Record<string, string>) => {
    try {
    
    if (card.chartType === 'alert' && card.alert) {
      if (!card.alert.enabled) {
        setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: [], rawData: null } }));
        return;
      }
      const resp = await globalAlertService.fetchAlertData(card.alert as GlobalAlertRule);
      
      let chartData: unknown[] = [];
      if (resp && Array.isArray(resp.data)) {
         chartData = resp.data;
      } else if (Array.isArray(resp)) {
         chartData = resp;
      }

      setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: chartData, rawData: null } }));
      
      if (resp && typeof resp.triggered === 'boolean') {
         // It has triggered status. 
         let status: AlertStatus;
         if (resp.alertStatus) {
            status = resp.alertStatus;
         } else {
            const alertRule = card.alert as GlobalAlertRule;
            const priority = alertRule.priority || 'medium';
            let severity: 'info' | 'warning' | 'critical' = 'info';
            if (priority === 'critical') severity = 'critical';
            else if (priority === 'high') severity = 'warning';
            
            // Construct minimal status if backend only returns { triggered: true, ... }
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
         setAlertStatusMap(prev => ({ ...prev, [card.id]: status }));
      }
      return;
    }
      const { start, end } = timeRangeToBounds(card.selection.timeRange);
      const groupBy = card.selection.dimensions && card.selection.dimensions.length > 0 ? card.selection.dimensions : undefined;
      const where = groupBy ? buildGlobalWhere(filtersOverride ?? globalFilterValues) : undefined;
      const req: MetricQueryRequest = {
        metric: card.metricId,
        group_by: groupBy,
        where,
        start_time: start,
        end_time: end,
        order: ['asc'],
        limit: 500
      };
      const resp = await metricsService.getMetricValue(req);
      const data = transformMetricFlowToChartData(resp);
      setCardDataMap(prev => ({ ...prev, [card.id]: { chartData: data, rawData: resp } }));
    } catch (e) {
      console.warn(`Card ${card.id}: failed to load data.`, e);
      // Do not set empty array on error, so it can be retried by useEffect when conditions change
      // setCardDataMap(prev => ({ ...prev, [card.id]: [] }));
    }
  };

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
    load();
    return () => { alive = false; };
  }, [search, categoryId, metricBuilderOpen]);



  // Preview update with real data and data-driven chart type
  useEffect(() => {
    let alive = true;
    const loadPreview = async () => {
      if (!selectedMetric) {
        if (alive) setPreviewData([]);
        if (alive) setPreviewRawData(null);
        if (alive) setPreviewType('bar');
        return;
      }

      try {
        const { start, end } = timeRangeToBounds(timeRange);
        const req: MetricQueryRequest = {
          metric: selectedMetric.name,
          group_by: selectedDims.length > 0 ? selectedDims : undefined,
          start_time: start,
          end_time: end,
          order: ['asc'],
          limit: 500
        };
        const resp = await metricsService.getMetricValue(req);
        const data = transformMetricFlowToChartData(resp);
        if (alive) {
          setPreviewData(data);
          setPreviewRawData(resp);
          if (isTimeData(data)) {
            setPreviewType('line');
          } else if (isGroupedData(data)) {
            setPreviewType('groupedBar');
          } else if (!selectedDims || selectedDims.length === 0) {
            setPreviewType('kpi');
          } else {
            setPreviewType('bar');
          }
        }
      } catch (e) {
        console.warn('Preview: failed to load real data, showing empty.', e);
        if (alive) {
          setPreviewData([]);
          setPreviewRawData(null);
          // fall back to dims to decide chart type
          setPreviewType(chartTypeFromDims(selectedDims, availableDimsDetailed));
        }
      }
    };
    loadPreview();
    return () => { alive = false; };
  }, [selectedMetric, selectedDims, timeRange, selectedMetricDef, customDateRange]);

  // templates list
  useEffect(() => {
    listAnalyses().then(list => setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description, isTemplate: i.isTemplate }))));
  }, []);

  // Load dimensions by metric via MCP when metric changes
  useEffect(() => {
    const loadDims = async () => {
      if (!selectedMetricDef) {
        setAvailableDims([]);
        setSelectedDims([]);
        return;
      }
      try {
        const resp = await findDimensionsByMetric(selectedMetricDef.name);
        const dims = Array.isArray(resp?.dimensions) ? resp.dimensions : [];
        setAvailableDimsDetailed(dims);
        setAvailableDims(dims.map(d => d.qualified_name || d.name));
        // initialize selected type to the first inferred type (prefer CATEGORICAL/TIME)
        const types = Array.from(new Set(dims.map(inferType)));
        setSelectedDimType(types[0] ?? 'CATEGORICAL');
      } catch (e) {
        console.warn('Failed to load metric dimensions, defaulting to empty.', e);
        setAvailableDimsDetailed([]);
        setAvailableDims([]);
        setSelectedDimType('');
      }
      // reset selected dimensions on metric change to avoid invalid selections
      setSelectedDims([]);
    };
    loadDims();
  }, [selectedMetricDef]);

  const toggleDim = (dim: string) => {
    setSelectedDims(prev => prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]);
  };

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

  const addCardToBoard = () => {
    if (!selectedMetric) {
      toast({ title: 'Please select a metric', description: 'Select a metric on the left before adding a card' });
      return;
    }

    let finalTimeRange = timeRange;
    if (timeRange === 'Custom') {
       if (customDateRange?.from && customDateRange?.to) {
          finalTimeRange = `Custom:${format(customDateRange.from, 'yyyy-MM-dd')}:${format(customDateRange.to, 'yyyy-MM-dd')}`;
       } else {
          toast({ title: "Invalid Date Range", description: "Please select start and end dates" });
          return;
       }
    }

    // Prefer data-driven type; if no preview data yet, infer from selected dimensions
    let chartTypeForBoard: BIChartType = chartTypeFromDims(selectedDims, availableDimsDetailed);
    if (previewData.length > 0) {
       if (isTimeData(previewData)) chartTypeForBoard = 'line';
       else if (isGroupedData(previewData)) chartTypeForBoard = 'groupedBar';
       else if (!selectedDims || selectedDims.length === 0) chartTypeForBoard = 'kpi';
       else chartTypeForBoard = 'bar';
    }

    const titleTimeRange = timeRange === 'Custom' && customDateRange?.from && customDateRange?.to
      ? `${format(customDateRange.from, 'yyyy-MM-dd')} to ${format(customDateRange.to, 'yyyy-MM-dd')}`
      : timeRange;

    const newCard: BIChartCard = {
      id: `card_${Date.now()}`,
      title: `${selectedMetric.name} · ${titleTimeRange}`,
      // Use metric name for backend metricFlow API compatibility
      metricId: selectedMetric.name,
      chartType: chartTypeForBoard,
      size: 'md',
      selection: { dimensions: selectedDims, timeRange: finalTimeRange }
    };

    setCards(prev => [...prev, newCard]);
    toast({ title: 'Added', description: 'Chart has been added to the analysis board' });
    // Load real data for the newly added card
    void loadCardDataFor(newCard);
    setActiveSection('dashboard');
    setMetricBuilderOpen(false);
  };

  // drag-and-drop reorder
  const onDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', String(index));
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onDrop = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIndex)) return;
    setCards(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const resizeCard = (index: number, size: BICardSize) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, size } : c));
  };
  const updateCard = (index: number, updatedCard: BIChartCard) => {
    setCards(prev => prev.map((c, i) => i === index ? updatedCard : c));
    // Clear data for this card to force reload
    setCardDataMap(prev => {
      const next = { ...prev };
      delete next[updatedCard.id];
      return next;
    });
  };
  const removeCard = (index: number) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleGlobalFilterChange = (dimensionKey: string, value: string) => {
    setGlobalFilterValues(prev => {
      const next = { ...prev, [dimensionKey]: value };
      setCardDataMap({});
      setAlertStatusMap({});
      cards.forEach(c => {
        void loadCardDataFor(c, next);
      });
      return next;
    });
  };

  const clearGlobalFilters = () => {
    const next: Record<string, string> = {};
    setGlobalFilterValues(next);
    setCardDataMap({});
    setAlertStatusMap({});
    cards.forEach(c => {
      void loadCardDataFor(c, next);
    });
  };

  // Load card data when cards change (only for missing ones)
  useEffect(() => {
    cards.forEach(c => {
      if (!cardDataMap[c.id]) {
        void loadCardDataFor(c);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const resetBoard = () => {
    setCards([]);
    setCardDataMap({});
    setCurrentAnalysisId(null);
    setSaveName('');
    setSaveDesc('');
    toast({ title: 'Board Reset', description: 'Started a new analysis' });
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast({ title: 'Enter analysis name', description: 'Name cannot be empty' });
      return;
    }

    if (currentAnalysisId) {
      await updateAnalysis({ id: currentAnalysisId,userId:user.userId, name: saveName.trim(), description: saveDesc.trim(), cards });
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
    const record = await saveAnalysis({ id: "", name: saveName.trim(), description: saveDesc.trim(), cards ,userId:""});
    setCurrentAnalysisId(record.id);
    setSaveOpen(false);
    listAnalyses().then(list => setTemplates(list.map(i => ({ id: i.id, name: i.name, description: i.description, isTemplate: i.isTemplate }))));
    toast({ title: 'Saved', description: 'Analysis saved as new copy' });
  };

  const loadTemplate = async (id: string) => {
    const tpl = await getAnalysis(id);
    if (!tpl) return;
    setCards(tpl.cards);
    setCardDataMap({});
    tpl.cards.forEach(c => { void loadCardDataFor(c); });
    // If template, treat as new copy (cannot modify original)
    if (tpl.isTemplate) {
      setCurrentAnalysisId(null);
      toast({ title: 'Template loaded', description: `Loaded "${tpl.name}" as a new board` });
    } else {
      setCurrentAnalysisId(tpl.id);
      toast({ title: 'Analysis loaded', description: `Board switched to "${tpl.name}"` });
    }
    setSaveName(tpl.name);
    setSaveDesc(tpl.description || '');
    setActiveSection('dashboard');
    setPendingScrollToDashboard(true);
  };

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

  const copyShareLink = () => {
    if (!currentAnalysisId) return;
    const url = `${window.location.origin}/share/analysis/${currentAnalysisId}`;
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
                  onAddAlert={() => setAddAlertOpen(true)}
                  alertStatusMap={alertStatusMap}
                  onAcknowledge={handleAcknowledge}
                  globalFilterDimensions={commonFilterDimensions}
                  globalFilterValues={globalFilterValues}
                  onGlobalFilterChange={handleGlobalFilterChange}
                  onClearGlobalFilters={clearGlobalFilters}
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

          <Sheet open={metricBuilderOpen} onOpenChange={setMetricBuilderOpen}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[1100px] p-0">
              <div className="flex h-full flex-col">
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    Build a Chart
                  </SheetTitle>
                  <SheetDescription>
                    Choose a metric, dimensions, and time range, then add it to the dashboard.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-12 gap-6">
                    <Card className="col-span-12 lg:col-span-4 h-fit border-l-4 border-l-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          Metric Configuration
                        </CardTitle>
                        <CardDescription>Select metrics and dimensions to analyze</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Metric Filter</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search metrics..."
                                  value={search}
                                  onChange={(e) => setSearch(e.target.value)}
                                  className="pl-8"
                                />
                              </div>
                              <Select value={categoryId === '' ? 'all' : categoryId} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Available Metrics</Label>
                            <ScrollArea className="h-[200px] rounded-md border p-2">
                              {metricsLoading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                  Loading...
                                </div>
                              ) : metricsList.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                  No metrics found
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {metricsList.map(m => {
                                    const id = m.id ?? m.name;
                                    const isSelected = selectedMetricId === id;
                                    return (
                                      <button
                                        key={id}
                                        onClick={() => { setSelectedMetricId(id); setSelectedMetricDef(m); }}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group ${
                                          isSelected
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'hover:bg-accent hover:text-accent-foreground'
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium truncate">{m.label || m.name}</div>
                                          {m.description && (
                                            <div className={`text-xs truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                              {m.description}
                                            </div>
                                          )}
                                        </div>
                                        {isSelected && <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>

                        <Separator />

                        {selectedMetric ? (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase">Dimensions</Label>
                              {selectedDims.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {selectedDims.length} selected
                                </Badge>
                              )}
                            </div>

                            <Tabs value={selectedDimType || 'CATEGORICAL'} onValueChange={setSelectedDimType} className="w-full">
                              <TabsList className="w-full grid grid-cols-2 mb-2">
                                {Array.from(new Set(availableDimsDetailed.map(inferType))).sort().map(t => (
                                  <TabsTrigger key={t} value={t} className="text-xs">
                                    {t === 'TIME' ? 'Time' : 'Categorical'}
                                  </TabsTrigger>
                                ))}
                              </TabsList>

                              <div className="relative mb-2">
                                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                <Input
                                  value={dimSearch}
                                  onChange={(e) => setDimSearch(e.target.value)}
                                  placeholder="Filter dimensions..."
                                  className="h-8 pl-7 text-xs"
                                />
                              </div>

                              <ScrollArea className="h-[180px] rounded-md border p-2">
                                <div className="grid grid-cols-1 gap-1">
                                  {filteredDims.map((d) => {
                                    const val = d.qualified_name || d.name;
                                    const label = d.description || d.qualified_name || d.name;
                                    const isChecked = selectedDims.includes(val);
                                    return (
                                      <label
                                        key={val}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-sm transition-colors ${
                                          isChecked ? 'bg-accent/50' : 'hover:bg-accent/20'
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={() => toggleDim(val)}
                                          className="h-4 w-4"
                                        />
                                        <span className="truncate flex-1" title={label}>{label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            </Tabs>

                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase">Time Range</Label>
                              <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Past 7 days">Past 7 days</SelectItem>
                                  <SelectItem value="Past 30 days">Past 30 days</SelectItem>
                                  <SelectItem value="Past 90 days">Past 90 days</SelectItem>
                                  <SelectItem value="Past year">Past year</SelectItem>
                                  <SelectItem value="Custom">Custom Range</SelectItem>
                                </SelectContent>
                              </Select>

                              {timeRange === 'Custom' && (
                                <div className="pt-1 animate-in fade-in slide-in-from-top-1">
                                  <DatePickerWithRange
                                    date={customDateRange}
                                    onSelect={setCustomDateRange}
                                    className="w-full"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                            <p className="text-sm">Select a metric above to configure dimensions</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="col-span-12 lg:col-span-8 h-full flex flex-col border-l-4 border-l-blue-500/20">
                      <CardHeader className="pb-2 border-b">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {previewType === 'line' ? <LineChart className="h-5 w-5 text-blue-500" /> :
                                previewType === 'pie' ? <PieChart className="h-5 w-5 text-purple-500" /> :
                                  <BarChart3 className="h-5 w-5 text-green-500" />}
                              Preview
                            </CardTitle>
                            <CardDescription>
                              Real-time preview based on selected metrics and dimensions
                            </CardDescription>
                          </div>
                          {selectedMetric && (
                            <Badge variant="outline" className="text-xs font-mono">
                              Type: {previewType}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 p-6 min-h-[400px] flex flex-col">
                        {selectedMetric ? (
                          <div className="flex-1 w-full h-full min-h-[350px]">
                            <ChartCard
                              card={{
                                id: 'preview',
                                title: `${selectedMetric.name} · ${timeRange}`,
                                metricId: selectedMetric.name,
                                chartType: previewType,
                                size: 'lg',
                                selection: { dimensions: selectedDims, timeRange }
                              }}
                              data={previewData}
                              sourceData={previewRawData ?? undefined}
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <div className="p-4 bg-muted rounded-full">
                              <BarChart3 className="h-8 w-8 opacity-50" />
                            </div>
                            <p>Start by selecting a metric from the configuration panel</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t bg-muted/10 py-4 flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {previewData.length > 0 ? `${previewData.length} data points loaded` : 'No data loaded'}
                        </div>
                        <Button
                          onClick={addCardToBoard}
                          disabled={!selectedMetric}
                          className="gap-2"
                          size="lg"
                        >
                          <Plus className="h-4 w-4" />
                          Add to Dashboard
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Dialog open={addAlertOpen} onOpenChange={setAddAlertOpen}>
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
               <Select value={alertRuleId} onValueChange={setAlertRuleId}>
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
                <Select value={alertTimeRange} onValueChange={setAlertTimeRange}>
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
                       onSelect={setAlertCustomDateRange} 
                       className="w-full"
                     />
                   </div>
                )}
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAlertOpen(false)}>Cancel</Button>
            <Button onClick={confirmAddAlert} disabled={!alertRuleId}>Add Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          {/* Save dialog */}
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
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
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Enter analysis name" />
            </div>
            <div>
              <label className="text-sm">Description</label>
              <Input value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="Optional: brief description of purpose" />
            </div>
          </div>
          <DialogFooter>
            {currentAnalysisId && (
              <Button variant="outline" onClick={handleSaveAsNew}>
                Save as New
              </Button>
            )}
            <Button onClick={handleSave}>{currentAnalysisId ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
          </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Analysis</DialogTitle>
            <DialogDescription>
              Share this analysis with external users. Anyone with the link can view it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="flex items-center space-x-2">
                <Input value={`${window.location.origin}/share/analysis/${currentAnalysisId}`} readOnly />
                <Button size="icon" onClick={copyShareLink}>
                   <Copy className="h-4 w-4" />
                </Button>
             </div>
          </div>
          <DialogFooter>
             <Button onClick={() => window.open(`/share/analysis/${currentAnalysisId}`, '_blank')}>Open Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </main>
      </div>
    </div>
  );
};

export default BIAnalysisPage;
