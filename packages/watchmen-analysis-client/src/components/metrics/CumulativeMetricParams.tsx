import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CumulativeTypeParams, MetricDefinition, TimeGranularity, PeriodAggregation } from '@/model/metricsManagement';
import { getMetrics } from '@/services/metricsManagementService';
import { Label } from '@/components/ui/label';

interface CumulativeMetricParamsProps {
  params: CumulativeTypeParams;
  onChange: (params: CumulativeTypeParams) => void;
}

const CumulativeMetricParams: React.FC<CumulativeMetricParamsProps> = ({ params, onChange }) => {
  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const metrics = await getMetrics();
        setAvailableMetrics(metrics || []);
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, []);

  const updateParams = (updates: Partial<CumulativeTypeParams>) => {
    onChange({ ...params, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Metric</Label>
        <Select
          value={params.metric?.name || ''}
          onValueChange={(value) => {
            const selectedMetric = availableMetrics.find(m => m.name === value);
            updateParams({
              metric: {
                name: value,
                alias: selectedMetric?.name || '',
                filter: params.metric?.filter,
                offset_window: params.metric?.offset_window,
                offset_to_grain: params.metric?.offset_to_grain
              }
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a metric" />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map((m) => (
              <SelectItem key={m.name} value={m.name}>
                {m.label || m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Time Granularity (Grain to Date)</Label>
          <Select
            value={params.grain_to_date || ''}
            onValueChange={(value) => updateParams({ grain_to_date: value as TimeGranularity })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select granularity" />
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

        <div className="space-y-2">
          <Label>Period Aggregation</Label>
          <Select
             value={params.period_agg || ''}
             onValueChange={(value) => updateParams({ period_agg: value as PeriodAggregation })}
          >
            <SelectTrigger>
                <SelectValue placeholder="Select period aggregation" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="sum">Sum</SelectItem>
                <SelectItem value="avg">Average</SelectItem>
                <SelectItem value="min">Min</SelectItem>
                <SelectItem value="max">Max</SelectItem>
                <SelectItem value="count">Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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

export default CumulativeMetricParams;
