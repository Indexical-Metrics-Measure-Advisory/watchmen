import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { MetricTypeParams, MetricReference, InputMeasure, OffsetWindow, MetricDefinition } from '@/model/metricsManagement';
import { getMetrics } from '@/services/metricsManagementService';
import { useTranslation } from 'react-i18next';

interface DerivedMetricParamsProps {
  params: MetricTypeParams;
  onChange: (params: MetricTypeParams) => void;
}

const DerivedMetricParams: React.FC<DerivedMetricParamsProps> = ({ params, onChange }) => {
  const { t } = useTranslation('metricsParams');
  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Load available metrics on component mount
  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const metrics = await getMetrics();
        setAvailableMetrics(metrics);
      } catch (error) {
        console.error('Failed to load metrics:', error);
        // Fallback to some common metric names if API fails
         setAvailableMetrics([
           { name: 'total_policies_issued', label: 'Total Policies Issued', description: 'Total number of issued policies', type: 'simple', type_params: {}, createdAt: '', updatedAt: '' },
           { name: 'total_annual_premium_hkd', label: 'Annual Premium Income (HKD)', description: 'Total annual premium income', type: 'simple', type_params: {}, createdAt: '', updatedAt: '' },
           { name: 'total_afyp_hkd', label: 'First Year Premium (HKD)', description: 'Total first year premium', type: 'simple', type_params: {}, createdAt: '', updatedAt: '' },
           { name: 'avg_premium_per_policy', label: 'Average Policy Premium', description: 'Average annual premium per policy', type: 'simple', type_params: {}, createdAt: '', updatedAt: '' },
           { name: 'active_banks_count', label: 'Active Banks', description: 'Number of active banks', type: 'simple', type_params: {}, createdAt: '', updatedAt: '' },
           { name: 'active_branches_count', label: 'Active Branches', description: 'Number of active branches', type: 'simple', type_params: {}, createdAt: '', updatedAt: '' }
         ]);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, []);

  const updateParams = (updates: Partial<MetricTypeParams>) => {
    onChange({ ...params, ...updates });
  };

  const addMetricReference = () => {
    const newMetric: MetricReference = {
      name: '',
      alias: null as any,
      filter: null,
      offset_window: null as any,
      offset_to_grain: null
    };
    updateParams({
      metrics: [...(params.metrics || []), newMetric]
    });
  };

  const updateMetricReference = (index: number, updates: Partial<MetricReference>) => {
    const updatedMetrics = [...(params.metrics || [])];
    updatedMetrics[index] = { ...updatedMetrics[index], ...updates };
    updateParams({ metrics: updatedMetrics });
  };

  const removeMetricReference = (index: number) => {
    const updatedMetrics = [...(params.metrics || [])];
    updatedMetrics.splice(index, 1);
    updateParams({ metrics: updatedMetrics });
  };

  const addInputMeasure = () => {
    const newMeasure: InputMeasure = {
      name: '',
      filter: null,
      alias: null,
      join_to_timespine: false,
      fill_nulls_with: null
    };
    updateParams({
      input_measures: [...(params.input_measures || []), newMeasure]
    });
  };

  const updateInputMeasure = (index: number, updates: Partial<InputMeasure>) => {
    const updatedMeasures = [...(params.input_measures || [])];
    updatedMeasures[index] = { ...updatedMeasures[index], ...updates };
    updateParams({ input_measures: updatedMeasures });
  };

  const removeInputMeasure = (index: number) => {
    const updatedMeasures = [...(params.input_measures || [])];
    updatedMeasures.splice(index, 1);
    updateParams({ input_measures: updatedMeasures });
  };

  const updateOffsetWindow = (metricIndex: number, window: Partial<OffsetWindow>) => {
    const currentMetric = params.metrics?.[metricIndex];
    if (currentMetric) {
      updateMetricReference(metricIndex, {
        offset_window: { ...currentMetric.offset_window, ...window } as OffsetWindow
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Expression */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('derived.expression')}</label>
        <Textarea
          value={params.expr || ''}
          onChange={(e) => updateParams({ expr: e.target.value })}
          placeholder={t('derived.expressionPlaceholder')}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{t('derived.expressionHint')}</p>
      </div>

      {/* Metric References */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Metric References</CardTitle>
            <Button size="sm" onClick={addMetricReference}>
              <Plus className="h-4 w-4 mr-2" />
              {t('derived.addMetric')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.metrics?.map((metric, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('derived.metricReference', { index: index + 1 })}</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeMetricReference(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('derived.metricName')}</label>
                  <Select
                    value={metric.name}
                    onValueChange={(value) => {
                      const selectedMetric = availableMetrics.find(m => m.name === value);
                      const updatedMetrics = [...(params.metrics || [])];
                      updatedMetrics[index] = { ...updatedMetrics[index], name: value };
                      
                      let updatedInputMeasures = [...(params.input_measures || [])];
                      
                      if (selectedMetric?.type === 'simple' && selectedMetric.type_params.measure) {
                        const measure = selectedMetric.type_params.measure;
                        // Check if measure already exists to avoid duplicates
                        const exists = updatedInputMeasures.some(im => im.name === measure.name);
                        if (!exists) {
                          updatedInputMeasures.push({
                            name: measure.name,
                            filter: measure.filter,
                            alias: measure.alias || null,
                            join_to_timespine: measure.join_to_timespine,
                            fill_nulls_with: measure.fill_nulls_with || null
                          });
                        }
                      }
                      
                      updateParams({ 
                        metrics: updatedMetrics,
                        input_measures: updatedInputMeasures
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingMetrics ? t('derived.loadingMetrics') : t('derived.selectMetric')} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingMetrics ? (
                        <SelectItem value="loading" disabled>{t('derived.loadingMetrics')}</SelectItem>
                      ) : availableMetrics.length > 0 ? (
                        availableMetrics.map((availableMetric) => (
                          <SelectItem key={availableMetric.name} value={availableMetric.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{availableMetric.label || availableMetric.name}</span>
                              <span className="text-xs text-muted-foreground">{availableMetric.description}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_metrics" disabled>{t('derived.noMetricsAvailable')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('derived.alias')}</label>
                  <Input
                    value={metric.alias}
                    onChange={(e) => updateMetricReference(index, { alias: e.target.value })}
                    placeholder={t('derived.aliasPlaceholder')}
                  />
                </div>
              </div>

              {/* Offset Window */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('derived.offsetWindow')}</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">{t('derived.count')}</label>
                    <Input
                      type="number"
                      value={metric.offset_window?.count || ''}
                      onChange={(e) => updateOffsetWindow(index, { count: parseInt(e.target.value) || 0 })}
                      placeholder={t('derived.countPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">{t('derived.granularity')}</label>
                    <Select
                      value={metric.offset_window?.granularity || ''}
                      onValueChange={(value) => updateOffsetWindow(index, { granularity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('derived.selectGranularity')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="quarter">Quarter</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {(!params.metrics || params.metrics.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              {t('derived.noMetricReferences')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Measures */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Input Measures</CardTitle>
            <Button size="sm" onClick={addInputMeasure}>
              <Plus className="h-4 w-4 mr-2" />
              {t('derived.addMeasure')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.input_measures?.map((measure, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('derived.inputMeasure', { index: index + 1 })}</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeInputMeasure(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('derived.measureName')}</label>
                  <Input
                    value={measure.name}
                    onChange={(e) => updateInputMeasure(index, { name: e.target.value })}
                    placeholder={t('derived.measureNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('derived.aliasOptional')}</label>
                  <Input
                    value={measure.alias || ''}
                    onChange={(e) => updateInputMeasure(index, { alias: e.target.value || null })}
                    placeholder={t('derived.aliasPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`join-timespine-${index}`}
                  checked={measure.join_to_timespine}
                  onChange={(e) => updateInputMeasure(index, { join_to_timespine: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor={`join-timespine-${index}`} className="text-sm font-medium">
                  {t('derived.joinToTimespine')}
                </label>
              </div>
            </div>
          ))}
          
          {(!params.input_measures || params.input_measures.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              {t('derived.noInputMeasures')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DerivedMetricParams;
