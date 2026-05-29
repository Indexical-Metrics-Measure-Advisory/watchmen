import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
  Plus, Edit, Trash2, BarChart3, GitBranch, Calculator, Search, Filter, Eye, Folder, FolderOpen, Tag, MoreHorizontal, LayoutGrid, List as ListIcon, Clock, RefreshCcw,
  CheckCircle2, XCircle, CircleDot, ShieldCheck, AlertTriangle
} from 'lucide-react';
import {
  MetricDefinition,
  MetricFilter,
  MetricTypeParams, Category,
  MetricValidationStatus
} from '@/model/metricsManagement';
import {
  getMetrics,
  getAllMetrics,
  deleteMetric,
  updateMetric,
  createMetric,
  getCategories,
  validateMetric
} from '@/services/metricsManagementService';
import { getSemanticModels } from '@/services/semanticModelService';
import DerivedMetricParams from '@/components/DerivedMetricParams';
import CumulativeMetricParams from '@/components/metrics/CumulativeMetricParams';
import ConversionMetricParams from '@/components/metrics/ConversionMetricParams';
import CategoryManagement from '@/components/metrics/CategoryManagement';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@/i18n/utils/format';

/** Validation status badge — standalone sub-component */
const ValidationBadge = ({ status, size = 'default' }: { status?: MetricValidationStatus; size?: 'sm' | 'default' }) => {
  const { t } = useTranslation('metricsEnum');
  if (!status || status === 'pending') {
    return (
      <Badge variant="outline" className={cn("border-muted-foreground/30 text-muted-foreground", size === 'sm' && "text-[10px] px-1.5 py-0")}>
        <CircleDot className="mr-1 h-3 w-3" /> {t('validationStatus.pending')}
      </Badge>
    );
  }
  if (status === 'validated') {
    return (
      <Badge className={cn("bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", size === 'sm' && "text-[10px] px-1.5 py-0")}>
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t('validationStatus.validated')}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className={cn(size === 'sm' && "text-[10px] px-1.5 py-0")}>
      <XCircle className="mr-1 h-3.5 w-3.5" /> {t('validationStatus.failed')}
    </Badge>
  );
};

const MetricsManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['common', 'metricsEnum', 'metricsManagement']);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableMeasures, setAvailableMeasures] = useState<{name: string, label: string, modelName: string}[]>([]);

  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [metricToEdit, setMetricToEdit] = useState<MetricDefinition | null>(null);
  const [editForm, setEditForm] = useState<Partial<MetricDefinition>>({});
  const [createForm, setCreateForm] = useState<Partial<MetricDefinition>>({});
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [validatingSet, setValidatingSet] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<MetricFilter>({
    categoryId: 'all',
    type: 'all',
    searchTerm: ''
  });
  const { toast } = useToast();
  const metricNamePattern = /^[a-z0-9_]+$/;
  const locale = i18n.resolvedLanguage ?? 'en';

  // Separate state for dropdown selectors — always contains ALL metrics regardless of search filter
  const [allMetricsForSelect, setAllMetricsForSelect] = useState<MetricDefinition[]>([]);

  const normalizeMeasure = (measure?: MetricTypeParams['measure']) => {
    return {
      name: measure?.name ?? '',
      join_to_timespine: measure?.join_to_timespine ?? false,
      filter: measure?.filter ?? '',
      alias: measure?.alias ?? '',
      fill_nulls_with: measure?.fill_nulls_with ?? undefined
    };
  };

  const getTypeLabel = (type?: string) => {
    if (!type) return '';
    return t(`metricsEnum:types.${type}`, type);
  };

  const getFormatLabel = (format?: string) => {
    if (!format) return t('metricsEnum:formats.number');
    return t(`metricsEnum:formats.${format}`, format);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use filter.categoryId directly
      const filterParams = { ...filter };
      if (filter.categoryId === 'all') {
         delete filterParams.categoryId;
      } else if (filter.categoryId === 'uncategorized') {
         filterParams.categoryId = undefined;
      }
      
      const metricsData = await getMetrics(filterParams);

      // console.log('loadData metrics:', metricsData);

      setMetrics(metricsData || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setMetrics([]);
      toast({
        title: t('common:error'),
        description: t('metricsManagement:loadFailed'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, toast]);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getCategories();
      // console.log('loadCategories result:', categoriesData);
      // Ensure we always set a valid array
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Always set an empty array on error to prevent undefined issues
      setCategories([]);
    }
  }, []);

  const loadSemanticModels = useCallback(async () => {
    try {
      const models = await getSemanticModels();
      const measures = models.flatMap(model => 
        model.measures.map(measure => ({
          name: measure.name,
          label: measure.label || measure.name,
          modelName: model.name
        }))
      );
      setAvailableMeasures(measures);
    } catch (error) {
      console.error('Error loading semantic models:', error);
      setAvailableMeasures([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [filter, loadData]);

  useEffect(() => {
    getAllMetrics().then(setAllMetricsForSelect).catch(() => setAllMetricsForSelect([]));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadSemanticModels();
  }, [loadSemanticModels]);



  const handleDeleteMetric = async (metricName: string) => {
    try {
      await deleteMetric(metricName);
      toast({
        title: t('common:success'),
        description: t('metricsManagement:metricDeleted')
      });
      loadData();
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('metricsManagement:deleteFailed'),
        variant: "destructive"
      });
    }
  };

  const handleEditMetric = (metric: MetricDefinition) => {
    setMetricToEdit(metric);
    setEditForm({
      id: metric.id,
      name: metric.name,
      label: metric.label,
      description: metric.description,
      type: metric.type,
      unit: metric.unit,
      format: metric.format,
      type_params: metric.type_params
    });
    setIsEditDialogOpen(true);
  };

  const handleViewLineage = (metric: MetricDefinition) => {
    navigate(`/metrics/lineage?metric=${encodeURIComponent(metric.name)}`);
  };

  const validateForm = (form: Partial<MetricDefinition>): string[] => {
    const errors: string[] = [];
    
    if (!form.name?.trim()) {
      errors.push(t('metricsManagement:validation.metricNameRequired'));
    } else if (!metricNamePattern.test(form.name.trim())) {
      errors.push(t('metricsManagement:validation.metricNamePattern'));
    }
    
    if (!form.label?.trim()) {
      errors.push(t('metricsManagement:validation.metricLabelRequired'));
    }
    
    if (!form.description?.trim()) {
      errors.push(t('metricsManagement:validation.metricDescriptionRequired'));
    }
    
    if (!form.type) {
      errors.push(t('metricsManagement:validation.metricTypeRequired'));
    }
    
    // 验证type_params
    if (form.type === 'simple' && !form.type_params?.measure?.name?.trim()) {
      errors.push(t('metricsManagement:validation.simpleMeasureRequired'));
    }
    
    if (form.type === 'ratio') {
      if (!form.type_params?.numerator?.name?.trim()) {
        errors.push(t('metricsManagement:validation.ratioNumeratorRequired'));
      }
      if (!form.type_params?.denominator?.name?.trim()) {
        errors.push(t('metricsManagement:validation.ratioDenominatorRequired'));
      }
    }
    
    if (form.type === 'derived') {
      if (!form.type_params?.expr?.trim()) {
        errors.push(t('metricsManagement:validation.derivedExpressionRequired'));
      }
      if (!form.type_params?.metrics || form.type_params.metrics.length === 0) {
        errors.push(t('metricsManagement:validation.derivedMetricReferenceRequired'));
      }
    }

    if (form.type === 'cumulative') {
      if (!form.type_params?.cumulative_type_params?.metric?.name) {
        errors.push(t('metricsManagement:validation.cumulativeBaseMetricRequired'));
      }
    }

    if (form.type === 'conversion') {
      if (!form.type_params?.conversion_type_params?.base_measure?.name && !form.type_params?.conversion_type_params?.base_metric?.name) {
        errors.push(t('metricsManagement:validation.conversionBaseRequired'));
      }
      if (!form.type_params?.conversion_type_params?.conversion_measure?.name && !form.type_params?.conversion_type_params?.conversion_metric?.name) {
        errors.push(t('metricsManagement:validation.conversionTargetRequired'));
      }
      if (!form.type_params?.conversion_type_params?.entity?.trim()) {
        errors.push(t('metricsManagement:validation.conversionEntityRequired'));
      }
    }
    
    return errors;
  };

  const cleanTypeParams = (params: MetricTypeParams | undefined, type: string | undefined): MetricTypeParams | undefined => {
    if (!params) return undefined;
    
    // Helper to convert empty/undefined to null
    const toNull = (val: any) => (val === undefined || val === '' ? null : val);

    const cleaned: any = { ...params };
    
    // Clean window
    if (cleaned.window && (!cleaned.window.count || !cleaned.window.granularity)) {
      cleaned.window = null;
    }

    if (type === 'simple') {
      // Ensure specific structure for simple metrics
      cleaned.expr = null;
      cleaned.window = null;
      cleaned.numerator = null;
      cleaned.denominator = null;
      cleaned.grain_to_date = null;
      cleaned.metrics = [];
      cleaned.conversion_type_params = null;
      cleaned.cumulative_type_params = null;

      if (cleaned.measure) {
        // Clean measure fields
        cleaned.measure = {
          ...cleaned.measure,
          alias: toNull(cleaned.measure.alias),
          filter: toNull(cleaned.measure.filter),
          fill_nulls_with: toNull(cleaned.measure.fill_nulls_with)
        };

        // Populate input_measures
        if (cleaned.measure.name) {
          cleaned.input_measures = [{
            name: cleaned.measure.name,
            alias: cleaned.measure.alias,
            filter: cleaned.measure.filter,
            fill_nulls_with: cleaned.measure.fill_nulls_with,
            join_to_timespine: cleaned.measure.join_to_timespine
          }];
        } else {
          cleaned.input_measures = [];
        }
      } else {
        cleaned.input_measures = [];
      }
    } else if (type === 'derived') {
      // Ensure specific structure for derived metrics
      cleaned.measure = null;
      cleaned.numerator = null;
      cleaned.denominator = null;
      cleaned.window = null;
      cleaned.grain_to_date = null;
      cleaned.conversion_type_params = null;
      cleaned.cumulative_type_params = null;
      
      // Clean metrics
      if (cleaned.metrics) {
        cleaned.metrics = cleaned.metrics.map((metric: any) => ({
          ...metric,
          alias: toNull(metric.alias),
          filter: toNull(metric.filter),
          offset_window: metric.offset_window ? {
            ...metric.offset_window,
            count: metric.offset_window.count || 0,
            granularity: metric.offset_window.granularity
          } : null,
          offset_to_grain: toNull(metric.offset_to_grain)
        }));
      } else {
        cleaned.metrics = [];
      }

      // Clean input_measures
      if (cleaned.input_measures) {
        cleaned.input_measures = cleaned.input_measures.map((measure: any) => ({
          ...measure,
          alias: toNull(measure.alias),
          filter: toNull(measure.filter),
          fill_nulls_with: toNull(measure.fill_nulls_with)
        }));
      } else {
        cleaned.input_measures = [];
      }
    } else {
        // Clean conversion params if not conversion type
        if (type !== 'conversion') {
          cleaned.conversion_type_params = undefined;
        } else {
            // Clean nested window in conversion params if invalid
            if (cleaned.conversion_type_params?.window && (!cleaned.conversion_type_params.window.count || !cleaned.conversion_type_params.window.granularity)) {
                cleaned.conversion_type_params = {
                    ...cleaned.conversion_type_params,
                    window: undefined
                };
            }
        }
        
        // Clean cumulative params if not cumulative type
        if (type !== 'cumulative') {
          cleaned.cumulative_type_params = undefined;
        } else {
            // Clean nested window in cumulative params if invalid
            if (cleaned.cumulative_type_params?.window && (!cleaned.cumulative_type_params.window.count || !cleaned.cumulative_type_params.window.granularity)) {
                cleaned.cumulative_type_params = {
                    ...cleaned.cumulative_type_params,
                    window: undefined
                };
            }
        }
    }

    return cleaned;
  };

  const handleSaveEdit = async () => {
    if (!metricToEdit || !editForm.name) return;
    
    const errors = validateForm(editForm);
    if (errors.length > 0) {
      toast({
        title: t('common:validationError'),
        description: errors.join('; '),
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Handle "none" categoryId by converting it to undefined
      const formDataToSubmit = {
        ...editForm,
        categoryId: editForm.categoryId === 'none' ? undefined : editForm.categoryId,
        type_params: cleanTypeParams(editForm.type_params, editForm.type)
      };
      
      await updateMetric(metricToEdit.name, formDataToSubmit);
      toast({
        title: t('common:success'),
        description: t('metricsManagement:metricUpdated', { name: editForm.label || metricToEdit.label }),
      });
      setIsEditDialogOpen(false);
      setMetricToEdit(null);
      setEditForm({});
      await loadData();
      // Auto-validate after save
      handleValidateMetric(formDataToSubmit as MetricDefinition);
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('metricsManagement:updateFailed'),
        variant: "destructive",
      });
    }
  };

  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return t('common:uncategorized');
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : t('common:uncategorized');
  };

  // Helper function to get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'simple':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'ratio':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'derived':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'conversion':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      case 'cumulative':
        return 'bg-teal-100 text-teal-800 hover:bg-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Helper function to handle create metric dialog
  const handleCreateMetricDialog = () => {
    setCreateForm({
      name: '',
      label: '',
      description: '',
      type: 'simple',
      unit: '',
      format: 'number',
      type_params: {
        measure: { name: '', join_to_timespine: false, filter: '', alias: '', fill_nulls_with: undefined },
        expr: '',
        window: undefined,
        grain_to_date: undefined,
        metrics: [],
        conversion_type_params: undefined,
        cumulative_type_params: undefined,
        input_measures: []
      }
    });
    setIsCreateDialogOpen(true);
  };

  // ===== Validation Logic =====

  const handleValidateMetric = useCallback(async (metric: MetricDefinition) => {
    const metricName = metric.name;
    if (validatingSet.has(metricName)) return;

    setValidatingSet(prev => new Set(prev).add(metricName));
    try {
      const result = await validateMetric(metricName);

      const merged: MetricDefinition = {
        ...metric,
        validationStatus: result.status,
        validationResult: result,
      };

      // Persist full metric with validation results back to backend
      await updateMetric(metricName, merged);

      // Update the metric in local state
      setMetrics(prev => prev.map(m =>
        m.name === metricName
          ? { ...m, validationStatus: result.status, validationResult: result }
          : m
      ));

      if (result.status === 'validated') {
        toast({ title: t('common:success'), description: t('metricsManagement:validationPassed', { name: metricName }) });
      } else {
        toast({
          title: t('metricsEnum:validationStatus.failed'),
          description: t('metricsManagement:validationFailed', { name: metricName, reason: result.error || t('common:unknown') }),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Unexpected validation error:', error);
      toast({ title: t('common:validationError'), description: t('metricsManagement:validationUnexpected'), variant: "destructive" });
    } finally {
      setValidatingSet(prev => {
        const next = new Set(prev);
        next.delete(metricName);
        return next;
      });
    }
  }, [validatingSet, toast]);

  // Helper function to update create form type params
  const updateCreateFormTypeParams = (params: MetricTypeParams) => {
    setCreateForm({ ...createForm, type_params: params });
  };

  // Helper function to update edit form type params
  const updateEditFormTypeParams = (params: MetricTypeParams) => {
    setEditForm({ ...editForm, type_params: params });
  };

  // Helper function to handle save create
  const handleSaveCreate = async () => {
    try {
      const errors = validateForm(createForm);
      if (errors.length > 0) {
        toast({
          title: t('common:validationError'),
          description: errors.join('; '),
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);
      // Handle "none" categoryId by converting it to undefined
      const formDataToSubmit = {
        ...createForm,
        categoryId: createForm.categoryId === 'none' ? undefined : createForm.categoryId,
        type_params: cleanTypeParams(createForm.type_params, createForm.type)
      } as Omit<MetricDefinition, 'createdAt' | 'updatedAt'>;
      
      await createMetric(formDataToSubmit);
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: '',
        label: '',
        description: '',
        type: 'simple',
        unit: '',
        format: 'number',
        type_params: {
          
          measure: { name: '', join_to_timespine: false, filter: '', alias: '', fill_nulls_with: undefined },
          expr: '',
          grain_to_date: undefined,
          metrics: [],
          input_measures: []
        }
      });
      await loadData();
      toast({
        title: t('common:success'),
        description: t('metricsManagement:metricCreated'),
      });
      // Auto-validate after create
      handleValidateMetric(formDataToSubmit as MetricDefinition);
    } catch (error) {
      console.error('Error creating metric:', error);
      toast({
        title: t('common:error'),
        description: t('metricsManagement:createFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={`${collapsed ? 'pl-20' : 'pl-56'} min-h-screen transition-all duration-300`}>
        <Header />
        
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Top Header & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">{t('metricsManagement:title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('metricsManagement:subtitle', { count: categories?.length || 0 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                className={showCategoryManagement ? "bg-accent text-accent-foreground border-accent" : ""}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {t('metricsManagement:categories')}
              </Button>
              <Button onClick={handleCreateMetricDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t('metricsManagement:newMetric')}
              </Button>
            </div>
          </div>

          {/* Category Management Panel */}
          <Collapsible open={showCategoryManagement} onOpenChange={setShowCategoryManagement} className="space-y-2">
            <CollapsibleContent>
               <Card className="border-dashed shadow-sm bg-muted/30">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Folder className="h-4 w-4 text-primary" />
                            {t('metricsManagement:categoryStructure')}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowCategoryManagement(false)}>
                            {t('common:close')}
                        </Button>
                    </div>
                    <CategoryManagement 
                      onCategoriesChanged={() => {
                        loadData();
                        loadCategories();
                      }}
                    /> 
                  </div>
               </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Toolbar: Search, Filters, View Mode */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
            <div className="flex flex-col md:flex-row flex-1 items-center gap-4 w-full md:w-auto">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('metricsManagement:searchPlaceholder')}
                  className="pl-9"
                  value={filter.searchTerm || ''}
                  onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                 {/* Category Filter */}
                 <Select
                    value={filter.categoryId}
                    onValueChange={(value) => setFilter({ ...filter, categoryId: value })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center gap-2 text-sm">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{filter.categoryId === 'all' ? t('metricsManagement:allCategories') : getCategoryName(filter.categoryId)}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('metricsManagement:allCategories')}</SelectItem>
                      <SelectItem value="uncategorized">{t('common:uncategorized')}</SelectItem>
                      <DropdownMenuSeparator />
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Type Filter */}
                  <Select
                    value={filter.type}
                    onValueChange={(value) => setFilter({ ...filter, type: value as MetricFilter['type'] })}
                  >
                    <SelectTrigger className="w-[150px]">
                       <div className="flex items-center gap-2 text-sm">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{filter.type === 'all' ? t('metricsEnum:types.all') : getTypeLabel(filter.type)}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('metricsEnum:types.all')}</SelectItem>
                      <SelectItem value="simple">{t('metricsEnum:types.simple')}</SelectItem>
                      <SelectItem value="ratio">{t('metricsEnum:types.ratio')}</SelectItem>
                      <SelectItem value="derived">{t('metricsEnum:types.derived')}</SelectItem>
                      <SelectItem value="cumulative">{t('metricsEnum:types.cumulative')}</SelectItem>
                      <SelectItem value="conversion">{t('metricsEnum:types.conversion')}</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md bg-muted/50 p-1 shrink-0">
               <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="h-4 w-4 mr-2" />
                  {t('metricsManagement:list')}
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  {t('metricsManagement:grid')}
                </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
          {isLoading ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </Card>
                ))}
             </div>
          ) : metrics.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                  <BarChart3 className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{t('metricsManagement:noMetricsTitle')}</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  {filter.searchTerm || filter.categoryId !== 'all' || filter.type !== 'all' 
                    ? t('metricsManagement:noMetricsFiltered') 
                    : t('metricsManagement:noMetricsEmpty')}
                </p>
                <Button onClick={handleCreateMetricDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('metricsManagement:createMetric')}
                </Button>
             </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="rounded-md border bg-card shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[25%]">{t('metricsManagement:table.metricName')}</TableHead>
                        <TableHead className="w-[12%]">{t('metricsManagement:table.category')}</TableHead>
                        <TableHead className="w-[12%]">{t('metricsManagement:table.type')}</TableHead>
                        <TableHead className="w-[12%]">{t('metricsManagement:table.format')}</TableHead>
                        <TableHead className="w-[13%]">{t('metricsManagement:table.validation')}</TableHead>
                        <TableHead className="w-[13%]">{t('metricsManagement:table.lastUpdated')}</TableHead>
                        <TableHead className="w-[13%] text-right">{t('common:actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((metric) => (
                        <TableRow key={metric.name} className="group hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{metric.label || metric.name}</span>
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{metric.name}</span>
                              {metric.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[250px] mt-1">{metric.description}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                             {metric.categoryId ? (
                                <Badge variant="outline" className="font-normal">
                                  {getCategoryName(metric.categoryId)}
                                </Badge>
                             ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                             )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${getTypeColor(metric.type)} bg-opacity-10 text-xs font-medium`}>
                              {metric.type === 'simple' && <BarChart3 className="mr-1 h-3 w-3" />}
                              {metric.type === 'ratio' && <Calculator className="mr-1 h-3 w-3" />}
                              {metric.type === 'derived' && <GitBranch className="mr-1 h-3 w-3" />}
                              {getTypeLabel(metric.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                               {metric.format === 'currency' && <span className="text-muted-foreground">$</span>}
                               {metric.format === 'percentage' && <span className="text-muted-foreground">%</span>}
                               {metric.format === 'number' && <span className="text-muted-foreground">#</span>}
                               <span className="capitalize">{getFormatLabel(metric.format)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{metric.unit || '-'}</span>
                          </TableCell>
                          <TableCell>
                            {validatingSet.has(metric.name) ? (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                                <span className="text-xs">{t('metricsEnum:validationStatus.validating')}</span>
                              </div>
                            ) : (
                              <ValidationBadge status={metric.validationStatus} />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{metric.updatedAt ? formatDate(metric.updatedAt, locale) : t('common:unknown')}</span>
                                </div>
                                <span>{metric.updatedBy || t('common:system')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">{t('common:actions')}</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('common:actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleValidateMetric(metric)}>
                                  <RefreshCcw className="mr-2 h-4 w-4" /> {t('metricsManagement:revalidate')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedMetric(metric)}>
                                  <Eye className="mr-2 h-4 w-4" /> {t('metricsManagement:viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewLineage(metric)}>
                                  <GitBranch className="mr-2 h-4 w-4" /> {t('metricsManagement:viewLineage')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditMetric(metric)}>
                                  <Edit className="mr-2 h-4 w-4" /> {t('common:edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteMetric(metric.name)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> {t('common:delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                   {metrics.map((metric) => (
                      <Card key={metric.name} className="group hover:shadow-md transition-all duration-200 border-muted/60">
                         <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className={`${getTypeColor(metric.type)} bg-opacity-10 text-[10px] px-1.5 py-0.5 h-5`}>
                                            {getTypeLabel(metric.type)}
                                        </Badge>
                                        <ValidationBadge status={metric.validationStatus} size="sm" />
                                        {metric.categoryId && (
                                            <span className="text-[10px] text-muted-foreground border px-1.5 rounded-sm bg-muted/20">
                                                {getCategoryName(metric.categoryId)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                                        {metric.label || metric.name}
                                    </h3>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedMetric(metric)}>{t('metricsManagement:viewDetails')}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewLineage(metric)}>{t('metricsManagement:viewLineage')}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditMetric(metric)}>{t('common:edit')}</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMetric(metric.name)}>{t('common:delete')}</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                {metric.description || t('metricsManagement:card.noDescription')}
                            </p>
                            
                            <Separator />
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-muted-foreground block">{t('metricsManagement:card.format')}</span>
                                    <span className="font-medium capitalize">{getFormatLabel(metric.format)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">{t('metricsManagement:card.unit')}</span>
                                    <span className="font-medium">{metric.unit || '-'}</span>
                                </div>
                            </div>
                            
                            <div className="pt-2 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">
                                    {t('metricsManagement:card.updated', { value: metric.updatedAt ? formatDate(metric.updatedAt, locale) : t('common:unknown') })}
                                </span>
                                <div className="flex gap-1">
                                    <Button 
                                      size="icon" variant="ghost" className="h-7 w-7" 
                                      onClick={() => handleValidateMetric(metric)}
                                      disabled={validatingSet.has(metric.name)}
                                      title={t('metricsManagement:revalidate')}
                                    >
                                      <RefreshCcw className={`h-3.5 w-3.5 ${validatingSet.has(metric.name) ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedMetric(metric)}>
                                        <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditMetric(metric)}>
                                        <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                         </div>
                      </Card>
                   ))}
                </div>
              )}
            </>
          )}
          </div>

 
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('metricsManagement:dialogs.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('metricsManagement:dialogs.editDescription')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.metricName')}</label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder={t('metricsManagement:dialogs.metricNamePlaceholder')}
                  className={editForm.name && !metricNamePattern.test(editForm.name) ? 'border-destructive' : ''}
                />
                {editForm.name && !metricNamePattern.test(editForm.name) ? (
                  <p className="text-xs text-destructive">{t('metricsManagement:dialogs.metricNameInvalid')}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.metricNameHint')}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.displayLabel')}</label>
                <Input
                  value={editForm.label || ''}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder={t('metricsManagement:dialogs.displayLabelPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.displayLabelHint')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('metricsManagement:dialogs.description')}</label>
              <Textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={t('metricsManagement:dialogs.descriptionPlaceholder')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.descriptionHint')}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.metricType')}</label>
                <Select
                  value={editForm.type || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value as 'simple' | 'ratio' | 'derived' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">{t('metricsEnum:types.simple')}</SelectItem>
                    <SelectItem value="ratio">{t('metricsEnum:types.ratio')}</SelectItem>
                    <SelectItem value="derived">{t('metricsEnum:types.derived')}</SelectItem>
                    <SelectItem value="cumulative">{t('metricsEnum:types.cumulative')}</SelectItem>
                    <SelectItem value="conversion">{t('metricsEnum:types.conversion')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.unit')}</label>
                <Input
                  value={editForm.unit || ''}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  placeholder={t('metricsManagement:dialogs.unitPlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.format')}</label>
                <Select
                  value={editForm.format || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectFormat')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">{t('metricsEnum:formats.number')}</SelectItem>
                    <SelectItem value="currency">{t('metricsEnum:formats.currency')}</SelectItem>
                    <SelectItem value="percentage">{t('metricsEnum:formats.percentage')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.category')}</label>
                <Select
                  value={editForm.categoryId || 'none'}
                  onValueChange={(value) => setEditForm({ ...editForm, categoryId: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common:noCategory')}</SelectItem>
                    {categories && categories.length > 0 && categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.typeSpecificHint')}</p>
            
            {/* Type-specific Parameters */}
            {editForm.type === 'derived' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.derivedParams')}</label>
                <DerivedMetricParams
                  params={editForm.type_params || {}}
                  onChange={updateEditFormTypeParams}
                />
              </div>
            )}

            {editForm.type === 'cumulative' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.cumulativeParams')}</label>
                <CumulativeMetricParams
                  params={editForm.type_params?.cumulative_type_params || {}}
                  onChange={(params) => updateEditFormTypeParams({ ...editForm.type_params, cumulative_type_params: params })}
                />
              </div>
            )}

            {editForm.type === 'conversion' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.conversionParams')}</label>
                <ConversionMetricParams
                  params={editForm.type_params?.conversion_type_params || {}}
                  onChange={(params) => updateEditFormTypeParams({ ...editForm.type_params, conversion_type_params: params })}
                />
              </div>
            )}
            
            {editForm.type === 'ratio' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('metricsManagement:dialogs.numerator')}</label>
                  <Select
                    value={editForm.type_params?.numerator?.name || ''}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        type_params: {
                          ...editForm.type_params,
                          numerator: {
                            name: value,
                            join_to_timespine: editForm.type_params?.numerator?.join_to_timespine || false,
                            filter: editForm.type_params?.numerator?.filter,
                            alias: editForm.type_params?.numerator?.alias,
                            fill_nulls_with: editForm.type_params?.numerator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('metricsManagement:dialogs.selectNumerator')} />
                    </SelectTrigger>
                    <SelectContent>
                      {allMetricsForSelect.filter(m => m.type === 'simple').map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('metricsManagement:dialogs.denominator')}</label>
                  <Select
                    value={editForm.type_params?.denominator?.name || ''}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        type_params: {
                          ...editForm.type_params,
                          denominator: {
                            name: value,
                            join_to_timespine: editForm.type_params?.denominator?.join_to_timespine || false,
                            filter: editForm.type_params?.denominator?.filter,
                            alias: editForm.type_params?.denominator?.alias,
                            fill_nulls_with: editForm.type_params?.denominator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('metricsManagement:dialogs.selectDenominator')} />
                    </SelectTrigger>
                    <SelectContent>
                      {allMetricsForSelect.filter(m => m.type === 'simple').map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {editForm.type === 'simple' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.measure')}</label>
                <Select
                  value={editForm.type_params?.measure?.name || ''}
                  onValueChange={(value) => setEditForm({ 
                    ...editForm, 
                    type_params: { 
                      ...editForm.type_params, 
                      measure: { 
                        ...normalizeMeasure(editForm.type_params?.measure),
                        name: value
                      }
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectMeasure')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeasures.map((measure, index) => (
                      <SelectItem key={`${measure.modelName}-${measure.name}-${index}`} value={measure.name}>
                        {measure.label} ({measure.modelName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{t('metricsManagement:dialogs.joinToTimespine')}</span>
                    <Switch
                      checked={normalizeMeasure(editForm.type_params?.measure).join_to_timespine}
                      onCheckedChange={(checked) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              join_to_timespine: checked
                            }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('metricsManagement:dialogs.alias')}</label>
                    <Input
                      value={normalizeMeasure(editForm.type_params?.measure).alias}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              alias: e.target.value
                            }
                          }
                        })
                      }
                      placeholder={t('metricsManagement:dialogs.aliasPlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('metricsManagement:dialogs.fillNullsWith')}</label>
                    <Input
                      type="number"
                      value={normalizeMeasure(editForm.type_params?.measure).fill_nulls_with ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              fill_nulls_with: val === '' ? undefined : Number(val)
                            }
                          }
                        });
                      }}
                      placeholder={t('metricsManagement:dialogs.fillNullsPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('metricsManagement:dialogs.filter')}</label>
                    <Textarea
                      value={normalizeMeasure(editForm.type_params?.measure).filter || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type_params: {
                            ...editForm.type_params,
                            measure: {
                              ...normalizeMeasure(editForm.type_params?.measure),
                              filter: e.target.value
                            }
                          }
                        })
                      }
                      placeholder={t('metricsManagement:dialogs.filterPlaceholder')}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleSaveEdit}>
              {t('common:saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建指标对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('metricsManagement:dialogs.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('metricsManagement:dialogs.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.metricName')}</label>
                <Input
                  value={createForm.name || ''}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder={t('metricsManagement:dialogs.metricNamePlaceholder')}
                  className={createForm.name && !metricNamePattern.test(createForm.name) ? 'border-destructive' : ''}
                />
                {createForm.name && !metricNamePattern.test(createForm.name) ? (
                  <p className="text-xs text-destructive">{t('metricsManagement:dialogs.metricNameInvalid')}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.metricNameHint')}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.displayLabel')}</label>
                <Input
                  value={createForm.label || ''}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  placeholder={t('metricsManagement:dialogs.displayLabelPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.displayLabelHint')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('metricsManagement:dialogs.description')}</label>
              <Textarea
                value={createForm.description || ''}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder={t('metricsManagement:dialogs.descriptionPlaceholder')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.descriptionHint')}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.metricType')}</label>
                <Select
                  value={createForm.type || ''}
                  onValueChange={(value) => setCreateForm({ ...createForm, type: value as 'simple' | 'ratio' | 'derived' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">{t('metricsEnum:types.simple')}</SelectItem>
                    <SelectItem value="ratio">{t('metricsEnum:types.ratio')}</SelectItem>
                    <SelectItem value="derived">{t('metricsEnum:types.derived')}</SelectItem>
                    <SelectItem value="cumulative">{t('metricsEnum:types.cumulative')}</SelectItem>
                    <SelectItem value="conversion">{t('metricsEnum:types.conversion')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.unit')}</label>
                <Input
                  value={createForm.unit || ''}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  placeholder={t('metricsManagement:dialogs.unitPlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.format')}</label>
                <Select
                  value={createForm.format || ''}
                  onValueChange={(value) => setCreateForm({ ...createForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectFormat')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">{t('metricsEnum:formats.number')}</SelectItem>
                    <SelectItem value="currency">{t('metricsEnum:formats.currency')}</SelectItem>
                    <SelectItem value="percentage">{t('metricsEnum:formats.percentage')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.category')}</label>
                <Select
                  value={createForm.categoryId || 'none'}
                  onValueChange={(value) => setCreateForm({ ...createForm, categoryId: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common:noCategory')}</SelectItem>
                    {categories && categories.length > 0 && categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.createTypeHint')}</p>
            
            {/* Type-specific Parameters */}
            {createForm.type === 'derived' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.derivedParams')}</label>
                <DerivedMetricParams
                  params={createForm.type_params || {
                    
                  }}
                  onChange={updateCreateFormTypeParams}
                />
              </div>
            )}

            {createForm.type === 'cumulative' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.cumulativeParams')}</label>
                <CumulativeMetricParams
                  params={createForm.type_params?.cumulative_type_params || {}}
                  onChange={(params) => updateCreateFormTypeParams({ ...createForm.type_params, cumulative_type_params: params })}
                />
              </div>
            )}

            {createForm.type === 'conversion' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.conversionParams')}</label>
                <ConversionMetricParams
                  params={createForm.type_params?.conversion_type_params || {}}
                  onChange={(params) => updateCreateFormTypeParams({ ...createForm.type_params, conversion_type_params: params })}
                />
              </div>
            )}
            
            {createForm.type === 'ratio' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('metricsManagement:dialogs.numerator')}</label>
                  <Select
                    value={createForm.type_params?.numerator?.name || ''}
                    onValueChange={(value) =>
                      setCreateForm({
                        ...createForm,
                        type_params: {
                          ...createForm.type_params,
                          numerator: {
                            name: value,
                            join_to_timespine: createForm.type_params?.numerator?.join_to_timespine || false,
                            filter: createForm.type_params?.numerator?.filter,
                            alias: createForm.type_params?.numerator?.alias,
                            fill_nulls_with: createForm.type_params?.numerator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('metricsManagement:dialogs.selectNumerator')} />
                    </SelectTrigger>
                    <SelectContent>
                      {allMetricsForSelect.filter(m => m.type === 'simple').map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('metricsManagement:dialogs.denominator')}</label>
                  <Select
                    value={createForm.type_params?.denominator?.name || ''}
                    onValueChange={(value) =>
                      setCreateForm({
                        ...createForm,
                        type_params: {
                          ...createForm.type_params,
                          denominator: {
                            name: value,
                            join_to_timespine: createForm.type_params?.denominator?.join_to_timespine || false,
                            filter: createForm.type_params?.denominator?.filter,
                            alias: createForm.type_params?.denominator?.alias,
                            fill_nulls_with: createForm.type_params?.denominator?.fill_nulls_with,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('metricsManagement:dialogs.selectDenominator')} />
                    </SelectTrigger>
                    <SelectContent>
                      {allMetricsForSelect.filter(m => m.type === 'simple').map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.label || m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {createForm.type === 'simple' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('metricsManagement:dialogs.measure')}</label>
                <Select
                  value={createForm.type_params?.measure?.name || ''}
                  onValueChange={(value) => setCreateForm({ 
                    ...createForm, 
                    type_params: { 
                      ...createForm.type_params, 
                      measure: { 
                        ...normalizeMeasure(createForm.type_params?.measure),
                        name: value
                      }
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('metricsManagement:dialogs.selectMeasure')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeasures.map((measure, index) => (
                      <SelectItem key={`${measure.modelName}-${measure.name}-${index}`} value={measure.name}>
                        {measure.label} ({measure.modelName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{t('metricsManagement:dialogs.joinToTimespine')}</span>
                    <Switch
                      checked={normalizeMeasure(createForm.type_params?.measure).join_to_timespine}
                      onCheckedChange={(checked) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              join_to_timespine: checked
                            }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('metricsManagement:dialogs.alias')}</label>
                    <Input
                      value={normalizeMeasure(createForm.type_params?.measure).alias}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              alias: e.target.value
                            }
                          }
                        })
                      }
                      placeholder={t('metricsManagement:dialogs.aliasPlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('metricsManagement:dialogs.fillNullsWith')}</label>
                    <Input
                      type="number"
                      value={normalizeMeasure(createForm.type_params?.measure).fill_nulls_with ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              fill_nulls_with: val === '' ? undefined : Number(val)
                            }
                          }
                        });
                      }}
                      placeholder={t('metricsManagement:dialogs.fillNullsPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('metricsManagement:dialogs.filter')}</label>
                    <Textarea
                      value={normalizeMeasure(createForm.type_params?.measure).filter || ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          type_params: {
                            ...createForm.type_params,
                            measure: {
                              ...normalizeMeasure(createForm.type_params?.measure),
                              filter: e.target.value
                            }
                          }
                        })
                      }
                      placeholder={t('metricsManagement:dialogs.filterPlaceholder')}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleSaveCreate}>
              {t('metricsManagement:createMetric')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Metric Details Dialog */}
      {selectedMetric && (
        <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedMetric.label}</DialogTitle>
              <DialogDescription>{selectedMetric.description}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Validation Status Block */}
                <div className={`rounded-lg p-4 border ${
                  selectedMetric.validationStatus === 'validated' ? 'bg-emerald-50/50 border-emerald-200' :
                  selectedMetric.validationStatus === 'failed' ? 'bg-red-50/50 border-red-200' :
                  'bg-muted/40 border-muted'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      {t('metricsManagement:details.validationStatus')}
                    </h4>
                    {selectedMetric.validationStatus && (
                      <ValidationBadge status={selectedMetric.validationStatus} />
                    )}
                    {!selectedMetric.validationStatus && (
                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                        <CircleDot className="mr-1 h-3 w-3" /> {t('metricsEnum:validationStatus.pending')}
                      </Badge>
                    )}
                  </div>
                  
                  {validatingSet.has(selectedMetric.name) && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      {t('metricsManagement:details.validatingMetric')}
                    </div>
                  )}

                  {selectedMetric.validationResult?.status === 'validated' && (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">{t('metricsManagement:details.dimensionsFound')}</span>
                        <span className="font-semibold text-emerald-700">{selectedMetric.validationResult.dimensionCount ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{t('metricsManagement:details.sampleValue')}</span>
                        <span className="font-semibold">{selectedMetric.validationResult.sampleValue ?? '-'}</span>
                      </div>
                    </div>
                  )}

                  {selectedMetric.validationResult?.status === 'failed' && (
                    <div className="mt-3 bg-red-100/60 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-red-700">{selectedMetric.validationResult.error || t('metricsManagement:details.validationFailed')}</span>
                      </div>
                    </div>
                  )}

                  {selectedMetric.validationResult?.lastValidatedAt && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t('metricsManagement:details.lastValidated', { value: formatDateTime(selectedMetric.validationResult.lastValidatedAt, locale) })}
                    </p>
                  )}

                  {/* Re-validate button inside detail dialog */}
                  <div className="mt-3">
                    <Button 
                      size="sm" variant="outline"
                      onClick={() => {
                        handleValidateMetric(selectedMetric);
                        setSelectedMetric(selectedMetric); // keep dialog open
                      }}
                      disabled={validatingSet.has(selectedMetric.name)}
                      className="h-7 text-xs"
                    >
                      <RefreshCcw className="mr-1.5 h-3 w-3" />
                      {t('metricsManagement:revalidateNow')}
                    </Button>
                  </div>

                  {/* Validation Log */}
                  {selectedMetric.validationResult?.logs && selectedMetric.validationResult.logs.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t('metricsManagement:details.validationLog')}</p>
                      {selectedMetric.validationResult.logs.map((log, idx) => (
                        <div key={idx} className={`flex items-start gap-2 rounded px-2 py-1.5 text-xs ${
                          log.status === 'success' ? 'bg-emerald-50/80' : 'bg-red-50/80'
                        }`}>
                          <span className="text-muted-foreground min-w-[90px] shrink-0">{log.step.replace('_', ' ')}</span>
                          <span className={log.status === 'success' ? 'text-emerald-600' : 'text-red-600'}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="text-muted-foreground truncate">{log.message}</span>
                          <span className="ml-auto text-muted-foreground tabular-nums">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t('metricsManagement:details.metricName')}</label>
                    <div className="mt-1 p-2 bg-muted rounded font-mono text-sm">
                      {selectedMetric.name}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('metricsManagement:details.type')}</label>
                    <div className="mt-1">
                      <Badge className={getTypeColor(selectedMetric.type)}>
                        {getTypeLabel(selectedMetric.type)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm font-medium">{t('metricsManagement:details.typeParameters')}</label>
                  <div className="mt-1 p-3 bg-muted rounded">
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedMetric.type_params, null, 2)}
                    </pre>
                  </div>
                </div>
                {selectedMetric.unit && (
                  <div>
                    <label className="text-sm font-medium">{t('metricsManagement:details.unit')}</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {selectedMetric.unit}
                    </div>
                  </div>
                )}
                {selectedMetric.format && (
                  <div>
                    <label className="text-sm font-medium">{t('metricsManagement:details.format')}</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {getFormatLabel(selectedMetric.format)}
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
        </main>
      </div>
    </div>
  );
};

export default MetricsManagement;
