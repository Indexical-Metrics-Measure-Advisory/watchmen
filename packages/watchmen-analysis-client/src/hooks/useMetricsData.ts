import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MetricDefinition,
  MetricFilter,
  MetricTypeParams,
  Category,
} from '@/model/metricsManagement';
import {
  getMetrics,
  getAllMetrics,
  updateMetric,
  getCategories,
  validateMetric,
} from '@/services/metricsManagementService';
import { getSemanticModels } from '@/services/semanticModelService';
import { useToast } from '@/hooks/use-toast';

const useMetricsData = () => {
  const { t, i18n } = useTranslation(['common', 'metricsEnum', 'metricsManagement']);
  const { toast } = useToast();

  // ===== useState (14 个) =====
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

  const metricNamePattern = /^[a-z0-9_]+$/;
  const locale = i18n.resolvedLanguage ?? 'en';

  // Separate state for dropdown selectors — always contains ALL metrics regardless of search filter
  const [allMetricsForSelect, setAllMetricsForSelect] = useState<MetricDefinition[]>([]);

  // ===== useCallback =====

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

  // ===== useEffect (4 个) =====

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

  return {
    // useState values
    metrics,
    categories,
    availableMeasures,
    selectedMetric,
    isLoading,
    isEditDialogOpen,
    isCreateDialogOpen,
    metricToEdit,
    editForm,
    createForm,
    showCategoryManagement,
    viewMode,
    validatingSet,
    filter,
    allMetricsForSelect,
    // useState setters
    setMetrics,
    setCategories,
    setAvailableMeasures,
    setSelectedMetric,
    setIsLoading,
    setIsEditDialogOpen,
    setIsCreateDialogOpen,
    setMetricToEdit,
    setEditForm,
    setCreateForm,
    setShowCategoryManagement,
    setViewMode,
    setValidatingSet,
    setFilter,
    setAllMetricsForSelect,
    // constants
    metricNamePattern,
    locale,
    // functions
    loadData,
    loadCategories,
    loadSemanticModels,
    handleValidateMetric,
  };
};

export default useMetricsData;
