import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ConversionTypeParams, MetricDefinition, TimeGranularity, InputMeasure, MetricReference } from '@/model/metricsManagement';
import { getMetrics } from '@/services/metricsManagementService';
import { getSemanticModels } from '@/services/semanticModelService';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ConversionMetricParamsProps {
  params: ConversionTypeParams;
  onChange: (params: ConversionTypeParams) => void;
}

const ConversionMetricParams: React.FC<ConversionMetricParamsProps> = ({ params, onChange }) => {
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
        <Label className="text-xs">Measure Name</Label>
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
            <SelectValue placeholder="Select measure" />
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
            <Label className="text-xs cursor-pointer" htmlFor={`join-${label}`}>Join Timespine</Label>
            <Switch 
                id={`join-${label}`}
                checked={measure?.join_to_timespine || false}
                onCheckedChange={(checked) => onChange({ ...measure!, join_to_timespine: checked })}
            />
        </div>
        <div>
             <Input 
                placeholder="Alias" 
                value={measure?.alias || ''}
                onChange={(e) => onChange({ ...measure!, alias: e.target.value })}
                className="h-8 text-xs"
            />
        </div>
      </div>
      
      <div>
         <Input 
            placeholder="Fill Nulls With (Number)" 
            type="number"
            value={measure?.fill_nulls_with || ''}
            onChange={(e) => onChange({ ...measure!, fill_nulls_with: parseFloat(e.target.value) || undefined })}
            className="h-8 text-xs"
        />
      </div>

      <div>
        <Textarea 
            placeholder="Filter expression" 
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
            <Label className="text-xs">Metric</Label>
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
                    <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                    {availableMetrics.map(m => (
                        <SelectItem key={m.name} value={m.name}>{m.label || m.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div>
            <Label className="text-xs">Filter</Label>
            <Textarea 
                placeholder="Filter expression"
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
                <Label>Calculation Type</Label>
                <Select
                    value={params.calculation || ''}
                    onValueChange={(value) => updateParams({ calculation: value })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select calculation" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ratio">Ratio</SelectItem>
                        <SelectItem value="difference">Difference</SelectItem>
                        <SelectItem value="percentage_change">Percentage Change</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Entity</Label>
                <Input 
                    value={params.entity || ''}
                    onChange={(e) => updateParams({ entity: e.target.value })}
                    placeholder="Entity name"
                />
            </div>
        </div>

        <Separator />
        <Label className="text-sm text-muted-foreground">Base Component</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInputMeasureForm('Base Measure', params.base_measure || { name: '', join_to_timespine: false }, (m) => updateParams({ base_measure: m }))}
            {renderMetricRefForm('Base Metric', params.base_metric || { name: '', alias: '' }, (m) => updateParams({ base_metric: m }))}
        </div>

        <Separator />
        <Label className="text-sm text-muted-foreground">Conversion Component</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {renderInputMeasureForm('Conversion Measure', params.conversion_measure || { name: '', join_to_timespine: false }, (m) => updateParams({ conversion_measure: m }))}
             {renderMetricRefForm('Conversion Metric', params.conversion_metric || { name: '', alias: '' }, (m) => updateParams({ conversion_metric: m }))}
        </div>

        <Separator />
         <div className="space-y-2">
            <Label>Window Settings</Label>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-xs text-muted-foreground">Count</Label>
                    <Input 
                        type="number"
                        value={params.window?.count || ''}
                        onChange={(e) => updateParams({ 
                            window: { ...params.window, count: parseInt(e.target.value) || undefined } 
                        })}
                        placeholder="Window count"
                    />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Granularity</Label>
                    <Select
                        value={params.window?.granularity || ''}
                        onValueChange={(value) => updateParams({ 
                            window: { ...params.window, granularity: value } 
                        })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Window granularity" />
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
    </div>
  );
};

export default ConversionMetricParams;
