import React from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
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
import { deleteMetric, updateMetric, createMetric } from '@/services/metricsManagementService';
import DerivedMetricParams from '@/components/DerivedMetricParams';
import CumulativeMetricParams from '@/components/metrics/CumulativeMetricParams';
import ConversionMetricParams from '@/components/metrics/ConversionMetricParams';
import CategoryManagement from '@/components/metrics/CategoryManagement';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@/i18n/utils/format';
import useMetricsData from '@/hooks/useMetricsData';
import { validateForm, cleanTypeParams, normalizeMeasure, getTypeLabel, getFormatLabel } from '@/utils/metricFormUtils';

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

/** Unified Metric Form Dialog for both create and edit */
interface MetricFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Partial<MetricDefinition>;
  setForm: React.Dispatch<React.SetStateAction<Partial<MetricDefinition>>>;
  categories: Category[];
  availableMeasures: { name: string; label: string; modelName: string }[];
  allMetricsForSelect: MetricDefinition[];
  metricNamePattern: RegExp;
  onSave: () => void;
}

const MetricFormDialog: React.FC<MetricFormDialogProps> = ({
  mode,
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  availableMeasures,
  allMetricsForSelect,
  metricNamePattern,
  onSave,
}) => {
  const { t } = useTranslation(['common', 'metricsEnum', 'metricsManagement']);

  const updateFormTypeParams = (params: MetricTypeParams) => {
    setForm(prev => ({ ...prev, type_params: params }));
  };

  const isEdit = mode === 'edit';
  const dialogTitle = isEdit ? t('metricsManagement:dialogs.editTitle') : t('metricsManagement:dialogs.createTitle');
  const dialogDesc = isEdit ? t('metricsManagement:dialogs.editDescription') : t('metricsManagement:dialogs.createDescription');
  const saveLabel = isEdit ? t('common:saveChanges') : t('metricsManagement:createMetric');
  const typeHintKey = 'metricsManagement:dialogs.typeSpecificHint';

  // Shared form field renderer — Basic Info tab
  const renderBasicFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('metricsManagement:dialogs.metricName')}</Label>
          <Input
            value={form.name || ''}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('metricsManagement:dialogs.metricNamePlaceholder')}
            className={form.name && !metricNamePattern.test(form.name) ? 'border-destructive' : ''}
          />
          {form.name && !metricNamePattern.test(form.name) ? (
            <p className="text-xs text-destructive">{t('metricsManagement:dialogs.metricNameInvalid')}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.metricNameHint')}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t('metricsManagement:dialogs.displayLabel')}</Label>
          <Input
            value={form.label || ''}
            onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder={t('metricsManagement:dialogs.displayLabelPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.displayLabelHint')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('metricsManagement:dialogs.description')}</Label>
        <Textarea
          value={form.description || ''}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder={t('metricsManagement:dialogs.descriptionPlaceholder')}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.descriptionHint')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t('metricsManagement:dialogs.metricType')}</Label>
          <Select
            value={form.type || ''}
            onValueChange={(value) => setForm(prev => ({ ...prev, type: value as 'simple' | 'ratio' | 'derived' | 'cumulative' | 'conversion' }))}
          >
            <SelectTrigger><SelectValue placeholder={t('metricsManagement:dialogs.selectType')} /></SelectTrigger>
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
          <Label>{t('metricsManagement:dialogs.unit')}</Label>
          <Input
            value={form.unit || ''}
            onChange={(e) => setForm(prev => ({ ...prev, unit: e.target.value }))}
            placeholder={t('metricsManagement:dialogs.unitPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('metricsManagement:dialogs.format')}</Label>
          <Select value={form.format || ''} onValueChange={(value) => setForm(prev => ({ ...prev, format: value }))}>
            <SelectTrigger><SelectValue placeholder={t('metricsManagement:dialogs.selectFormat')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="number">{t('metricsEnum:formats.number')}</SelectItem>
              <SelectItem value="currency">{t('metricsEnum:formats.currency')}</SelectItem>
              <SelectItem value="percentage">{t('metricsEnum:formats.percentage')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('metricsManagement:dialogs.category')}</Label>
        <Select value={form.categoryId || 'none'} onValueChange={(value) => setForm(prev => ({ ...prev, categoryId: value === 'none' ? undefined : value }))}>
          <SelectTrigger><SelectValue placeholder={t('metricsManagement:dialogs.selectCategory')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('common:noCategory')}</SelectItem>
            {categories && categories.length > 0 && categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Type-specific tab content
  const renderTypeSpecificFields = () => {
    if (!form.type) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <p>{t('metricsManagement:dialogs.selectTypeHint')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="uppercase text-xs">{getTypeLabel(form.type, t)}</Badge>
          <span className="text-sm text-muted-foreground">{t(typeHintKey)}</span>
        </div>

        {form.type === 'derived' && (
          <div className="space-y-2">
            <Label>{t('metricsManagement:dialogs.derivedParams')}</Label>
            <DerivedMetricParams
              params={form.type_params || {}}
              onChange={updateFormTypeParams}
            />
          </div>
        )}

        {form.type === 'cumulative' && (
          <div className="space-y-2">
            <Label>{t('metricsManagement:dialogs.cumulativeParams')}</Label>
            <CumulativeMetricParams
              params={form.type_params?.cumulative_type_params || {}}
              onChange={(params) => updateFormTypeParams({ ...form.type_params, cumulative_type_params: params })}
            />
          </div>
        )}

        {form.type === 'conversion' && (
          <div className="space-y-2">
            <Label>{t('metricsManagement:dialogs.conversionParams')}</Label>
            <ConversionMetricParams
              params={form.type_params?.conversion_type_params || {}}
              onChange={(params) => updateFormTypeParams({ ...form.type_params, conversion_type_params: params })}
            />
          </div>
        )}

        {form.type === 'ratio' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('metricsManagement:dialogs.numerator')}</Label>
              <Select
                value={form.type_params?.numerator?.name || ''}
                onValueChange={(value) =>
                  setForm(prev => ({
                    ...prev,
                    type_params: {
                      ...prev.type_params,
                      numerator: {
                        name: value,
                        join_to_timespine: prev.type_params?.numerator?.join_to_timespine || false,
                        filter: prev.type_params?.numerator?.filter,
                        alias: prev.type_params?.numerator?.alias,
                        fill_nulls_with: prev.type_params?.numerator?.fill_nulls_with,
                      },
                    },
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder={t('metricsManagement:dialogs.selectNumerator')} /></SelectTrigger>
                <SelectContent>
                  {allMetricsForSelect.filter(m => m.type === 'simple').map((m) => (
                    <SelectItem key={m.name} value={m.name}>{m.label || m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('metricsManagement:dialogs.denominator')}</Label>
              <Select
                value={form.type_params?.denominator?.name || ''}
                onValueChange={(value) =>
                  setForm(prev => ({
                    ...prev,
                    type_params: {
                      ...prev.type_params,
                      denominator: {
                        name: value,
                        join_to_timespine: prev.type_params?.denominator?.join_to_timespine || false,
                        filter: prev.type_params?.denominator?.filter,
                        alias: prev.type_params?.denominator?.alias,
                        fill_nulls_with: prev.type_params?.denominator?.fill_nulls_with,
                      },
                    },
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder={t('metricsManagement:dialogs.selectDenominator')} /></SelectTrigger>
                <SelectContent>
                  {allMetricsForSelect.filter(m => m.type === 'simple').map((m) => (
                    <SelectItem key={m.name} value={m.name}>{m.label || m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {form.type === 'simple' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('metricsManagement:dialogs.measure')}</Label>
              <Select
                value={form.type_params?.measure?.name || ''}
                onValueChange={(value) => setForm(prev => ({
                  ...prev,
                  type_params: {
                    ...prev.type_params,
                    measure: { ...normalizeMeasure(prev.type_params?.measure), name: value }
                  }
                }))}
              >
                <SelectTrigger><SelectValue placeholder={t('metricsManagement:dialogs.selectMeasure')} /></SelectTrigger>
                <SelectContent>
                  {availableMeasures.map((measure, index) => (
                    <SelectItem key={`${measure.modelName}-${measure.name}-${index}`} value={measure.name}>
                      {measure.label} ({measure.modelName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="!text-sm !font-normal">{t('metricsManagement:dialogs.joinToTimespine')}</Label>
                <Switch
                  checked={normalizeMeasure(form.type_params?.measure).join_to_timespine}
                  onCheckedChange={(checked) =>
                    setForm(prev => ({
                      ...prev,
                      type_params: {
                        ...prev.type_params,
                        measure: { ...normalizeMeasure(prev.type_params?.measure), join_to_timespine: checked }
                      }
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('metricsManagement:dialogs.alias')}</Label>
                <Input
                  value={normalizeMeasure(form.type_params?.measure).alias}
                  onChange={(e) =>
                    setForm(prev => ({
                      ...prev,
                      type_params: {
                        ...prev.type_params,
                        measure: { ...normalizeMeasure(prev.type_params?.measure), alias: e.target.value }
                      }
                    }))
                  }
                  placeholder={t('metricsManagement:dialogs.aliasPlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('metricsManagement:dialogs.fillNullsWith')}</Label>
                <Input
                  type="number"
                  value={normalizeMeasure(form.type_params?.measure).fill_nulls_with ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      type_params: {
                        ...prev.type_params,
                        measure: { ...normalizeMeasure(prev.type_params?.measure), fill_nulls_with: val === '' ? undefined : Number(val) }
                      }
                    }));
                  }}
                  placeholder={t('metricsManagement:dialogs.fillNullsPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('metricsManagement:dialogs.filter')}</Label>
                <Textarea
                  value={normalizeMeasure(form.type_params?.measure).filter || ''}
                  onChange={(e) =>
                    setForm(prev => ({
                      ...prev,
                      type_params: {
                        ...prev.type_params,
                        measure: { ...normalizeMeasure(prev.type_params?.measure), filter: e.target.value }
                      }
                    }))
                  }
                  placeholder={t('metricsManagement:dialogs.filterPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t('metricsManagement:dialogs.basicTab')}</TabsTrigger>
            <TabsTrigger value="typeParams">{t('metricsManagement:dialogs.typeParamsTab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="mt-4">
            {renderBasicFields()}
          </TabsContent>
          <TabsContent value="typeParams" className="mt-4">
            {renderTypeSpecificFields()}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button onClick={onSave}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MetricsManagement: React.FC = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'metricsEnum', 'metricsManagement']);
  const { toast } = useToast();

  const {
    metrics, categories, availableMeasures, selectedMetric, setSelectedMetric,
    isLoading, isEditDialogOpen, setIsEditDialogOpen, isCreateDialogOpen, setIsCreateDialogOpen,
    metricToEdit, setMetricToEdit, editForm, setEditForm, createForm, setCreateForm,
    showCategoryManagement, setShowCategoryManagement, viewMode, setViewMode,
    validatingSet, filter, setFilter, allMetricsForSelect,
    loadData, loadCategories, loadSemanticModels, handleValidateMetric,
    metricNamePattern, locale
  } = useMetricsData();

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

  const handleSaveEdit = async () => {
    if (!metricToEdit || !editForm.name) return;

    const errors = validateForm(editForm, metricNamePattern, t);
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

  // Helper function to handle save create
  const handleSaveCreate = async () => {
    try {
      const errors = validateForm(createForm, metricNamePattern, t);
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
                        <span>{filter.type === 'all' ? t('metricsEnum:types.all') : getTypeLabel(filter.type, t)}</span>
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
                              {getTypeLabel(metric.type, t)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                               {metric.format === 'currency' && <span className="text-muted-foreground">$</span>}
                               {metric.format === 'percentage' && <span className="text-muted-foreground">%</span>}
                               {metric.format === 'number' && <span className="text-muted-foreground">#</span>}
                               <span className="capitalize">{getFormatLabel(metric.format, t)}</span>
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
                                            {getTypeLabel(metric.type, t)}
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
                                    <span className="font-medium capitalize">{getFormatLabel(metric.format, t)}</span>
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

      {/* Unified Metric Form Dialog — Edit mode */}
      <MetricFormDialog
        mode="edit"
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        form={editForm}
        setForm={setEditForm}
        categories={categories}
        availableMeasures={availableMeasures}
        allMetricsForSelect={allMetricsForSelect}
        metricNamePattern={metricNamePattern}
        onSave={handleSaveEdit}
      />

      {/* Unified Metric Form Dialog — Create mode */}
      <MetricFormDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        form={createForm}
        setForm={setCreateForm}
        categories={categories}
        availableMeasures={availableMeasures}
        allMetricsForSelect={allMetricsForSelect}
        metricNamePattern={metricNamePattern}
        onSave={handleSaveCreate}
      />

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
                        {getTypeLabel(selectedMetric.type, t)}
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
                      {getFormatLabel(selectedMetric.format, t)}
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
