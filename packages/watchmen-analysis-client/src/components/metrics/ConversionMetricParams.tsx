import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ConversionTypeParams, MetricDefinition, TimeGranularity, InputMeasure, MetricReference } from '@/model/metricsManagement';
import { getMetrics } from '@/services/metricsManagementService';
import { getSemanticModels } from '@/services/semanticModelService';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConversionMetricParamsProps {
  params: ConversionTypeParams;
  onChange: (params: ConversionTypeParams) => void;
}

const ConversionMetricParams: React.FC<ConversionMetricParamsProps> = ({ params, onChange }) => {
  const { t } = useTranslation(['metricsParams', 'metricsEnum']);
  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>([]);
  const [availableMeasures, setAvailableMeasures] = useState<{name: string, label: string, modelName: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [metrics, models] = await Promise.all([
          getMetrics(),
          getSemanticModels()
        ]);
        
        setAvailableMetrics(metrics || []);
        
        const measures = models.flatMap(model => 
          model.measures.map(measure => ({
            name: measure.name,
            label: measure.label || measure.name,
            modelName: model.name
          }))
        );
        setAvailableMeasures(measures);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const updateParams = (updates: Partial<ConversionTypeParams>) => {
    onChange({ ...params, ...updates });
  };

  const renderInputMeasureForm = (
    label: string, 
    measure: InputMeasure | undefined, 
    onChange: (m: InputMeasure) => void
  ) => (
    <div className="space-y-3 p-3 border rounded-md">
      <Label className="font-semibold">{label}</Label>
      <div className="space-y-2">
        <Label className="text-xs">{t('metricsParams:conversion.measureName')}</Label>
        <Select
          value={measure?.name || ''}
          onValueChange={(value) => onChange({
            name: value,
            join_to_timespine: measure?.join_to_timespine || false,
            filter: measure?.filter,
            alias: measure?.alias,
            fill_nulls_with: measure?.fill_nulls_with
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('metricsParams:conversion.selectMeasure')} />
          </SelectTrigger>
          <SelectContent>
            {availableMeasures.map((m, idx) => (
              <SelectItem key={`${m.modelName}-${m.name}-${idx}`} value={m.name}>
                {m.label} ({m.modelName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between border rounded px-2 py-1">
            <Label className="text-xs cursor-pointer" htmlFor={`join-${label}`}>{t('metricsParams:conversion.joinTimespine')}</Label>
            <Switch 
                id={`join-${label}`}
                checked={measure?.join_to_timespine || false}
                onCheckedChange={(checked) => onChange({ ...measure!, join_to_timespine: checked })}
            />
        </div>
        <div>
             <Input 
                placeholder={t('metricsParams:conversion.aliasPlaceholder')} 
                value={measure?.alias || ''}
                onChange={(e) => onChange({ ...measure!, alias: e.target.value })}
                className="h-8 text-xs"
            />
        </div>
      </div>
      
      <div>
         <Input 
            placeholder={t('metricsParams:conversion.fillNullsPlaceholder')} 
            type="number"
            value={measure?.fill_nulls_with || ''}
            onChange={(e) => onChange({ ...measure!, fill_nulls_with: parseFloat(e.target.value) || undefined })}
            className="h-8 text-xs"
        />
      </div>

      <div>
        <Textarea 
            placeholder={t('metricsParams:conversion.filterPlaceholder')} 
            value={measure?.filter || ''}
            onChange={(e) => onChange({ ...measure!, filter: e.target.value })}
            className="text-xs min-h-[60px]"
        />
      </div>
    </div>
  );

  const renderMetricRefForm = (
      label: string,
      metricRef: MetricReference | undefined,
      onChange: (m: MetricReference) => void
  ) => (
    <div className="space-y-3 p-3 border rounded-md">
        <Label className="font-semibold">{label}</Label>
        <div className="space-y-2">
            <Label className="text-xs">{t('metricsParams:conversion.metric')}</Label>
            <Select
                value={metricRef?.name || ''}
                onValueChange={(value) => {
                    const selected = availableMetrics.find(m => m.name === value);
                    onChange({
                        name: value,
                        alias: selected?.name || '',
                        filter: metricRef?.filter
                    });
                }}
            >
                <SelectTrigger>
                    <SelectValue placeholder={t('metricsParams:conversion.selectMetric')} />
                </SelectTrigger>
                <SelectContent>
                    {availableMetrics.map(m => (
                        <SelectItem key={m.name} value={m.name}>{m.label || m.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div>
            <Label className="text-xs">{t('metricsParams:conversion.filter')}</Label>
            <Textarea 
                placeholder={t('metricsParams:conversion.filterPlaceholder')}
                value={metricRef?.filter || ''}
                onChange={(e) => onChange({ ...metricRef!, filter: e.target.value })}
                className="text-xs min-h-[60px]"
            />
        </div>
    </div>
  );

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>{t('metricsParams:conversion.calculationType')}</Label>
                <Select
                    value={params.calculation || ''}
                    onValueChange={(value) => updateParams({ calculation: value })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('metricsParams:conversion.selectCalculation')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ratio">{t('metricsEnum:calculation.ratio')}</SelectItem>
                        <SelectItem value="difference">{t('metricsEnum:calculation.difference')}</SelectItem>
                        <SelectItem value="percentage_change">{t('metricsEnum:calculation.percentage_change')}</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('metricsParams:conversion.calculationHint')}</p>
            </div>
             <div className="space-y-2">
                <Label>{t('metricsParams:conversion.entity')}</Label>
                <Input
                    value={params.entity || ''}
                    onChange={(e) => updateParams({ entity: e.target.value })}
                    placeholder={t('metricsParams:conversion.entityPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('metricsParams:conversion.entityHint')}</p>
            </div>
        </div>

        <Separator />
        <Label className="text-sm text-muted-foreground">{t('metricsParams:conversion.baseComponent')}</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInputMeasureForm(t('metricsParams:conversion.baseMeasure'), params.base_measure || { name: '', join_to_timespine: false }, (m) => updateParams({ base_measure: m }))}
            {renderMetricRefForm(t('metricsParams:conversion.baseMetric'), params.base_metric || { name: '', alias: '' }, (m) => updateParams({ base_metric: m }))}
        </div>

        <Separator />
        <Label className="text-sm text-muted-foreground">{t('metricsParams:conversion.conversionComponent')}</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {renderInputMeasureForm(t('metricsParams:conversion.conversionMeasure'), params.conversion_measure || { name: '', join_to_timespine: false }, (m) => updateParams({ conversion_measure: m }))}
             {renderMetricRefForm(t('metricsParams:conversion.conversionMetric'), params.conversion_metric || { name: '', alias: '' }, (m) => updateParams({ conversion_metric: m }))}
        </div>

        <Separator />
         <div className="space-y-2">
            <Label>{t('metricsParams:conversion.windowSettings')}</Label>
            <p className="text-xs text-muted-foreground">{t('metricsParams:conversion.windowHint')}</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-xs text-muted-foreground">{t('metricsParams:conversion.count')}</Label>
                    <Input
                        type="text"
                        value={params.window?.count || ''}
                        onChange={(e) => updateParams({
                            window: { ...params.window, count: parseInt(e.target.value) || undefined }
                        })}
                        placeholder={t('metricsParams:conversion.countPlaceholder')}
                    />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">{t('metricsParams:conversion.granularity')}</Label>
                    <Select
                        value={params.window?.granularity || ''}
                        onValueChange={(value) => updateParams({
                            window: { ...params.window, granularity: value }
                        })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('metricsParams:conversion.selectGranularity')} />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(TimeGranularity).map((granularity) => (
                                <SelectItem key={granularity} value={granularity}>
                                {granularity}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        <Separator />
        <div className="space-y-2">
            <Label>{t('metricsParams:conversion.constantProperties')}</Label>
            <div className="space-y-2">
                {(params.constant_properties || []).map((cp, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 items-end">
                        <div className="space-y-1">
                            <Input
                                placeholder={t('metricsParams:conversion.propertyNamePlaceholder')}
                                value={cp.property || ''}
                                onChange={(e) => {
                                    const updated = [...(params.constant_properties || [])];
                                    updated[index] = { ...updated[index], property: e.target.value };
                                    updateParams({ constant_properties: updated });
                                }}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1 flex gap-1">
                            <Input
                                placeholder={t('metricsParams:conversion.valuePlaceholder')}
                                value={cp.value || ''}
                                onChange={(e) => {
                                    const updated = [...(params.constant_properties || [])];
                                    updated[index] = { ...updated[index], value: e.target.value };
                                    updateParams({ constant_properties: updated });
                                }}
                                className="h-8 text-xs"
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    const updated = [...(params.constant_properties || [])];
                                    updated.splice(index, 1);
                                    updateParams({ constant_properties: updated });
                                }}
                                className="h-8 px-2"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                ))}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        updateParams({
                            constant_properties: [...(params.constant_properties || []), { property: '', value: '' }]
                        });
                    }}
                    className="text-xs"
                >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('metricsParams:conversion.addConstantProperty')}
                </Button>
            </div>
        </div>
    </div>
  );
};

export default ConversionMetricParams;
