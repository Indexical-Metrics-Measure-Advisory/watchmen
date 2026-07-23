import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CumulativeTypeParams, MetricDefinition, TimeGranularity, PeriodAggregation } from '@/model/metricsManagement';
import { getMetrics } from '@/services/metricsManagementService';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface CumulativeMetricParamsProps {
  params: CumulativeTypeParams;
  onChange: (params: CumulativeTypeParams) => void;
}

const CumulativeMetricParams: React.FC<CumulativeMetricParamsProps> = ({ params, onChange }) => {
  const { t } = useTranslation(['metricsParams', 'metricsEnum']);
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
        <Label>{t('metricsParams:cumulative.metric')}</Label>
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
            <SelectValue placeholder={t('metricsParams:cumulative.selectMetric')} />
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
          <Label>{t('metricsParams:cumulative.timeGranularity')}</Label>
          <Select
            value={params.grain_to_date || ''}
            onValueChange={(value) => updateParams({ grain_to_date: value as TimeGranularity })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('metricsParams:cumulative.selectTimeGranularity')} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TimeGranularity).map((granularity) => (
                <SelectItem key={granularity} value={granularity}>
                  {t(`metricsParams:granularity.${granularity}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('metricsParams:cumulative.timeGranularityHint')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('metricsParams:cumulative.periodAggregation')}</Label>
          <Select
             value={params.period_agg || ''}
             onValueChange={(value) => updateParams({ period_agg: value as PeriodAggregation })}
          >
            <SelectTrigger>
                <SelectValue placeholder={t('metricsParams:cumulative.selectPeriodAggregation')} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="sum">{t('metricsEnum:aggregation.sum')}</SelectItem>
                <SelectItem value="avg">{t('metricsEnum:aggregation.avg')}</SelectItem>
                <SelectItem value="min">{t('metricsEnum:aggregation.min')}</SelectItem>
                <SelectItem value="max">{t('metricsEnum:aggregation.max')}</SelectItem>
                <SelectItem value="count">{t('metricsEnum:aggregation.count')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('metricsParams:cumulative.periodAggregationHint')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('metricsParams:cumulative.windowSettings')}</Label>
        <p className="text-xs text-muted-foreground">{t('metricsParams:cumulative.windowHint')}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('metricsParams:cumulative.recentPrefix')}</span>
          <Input
            type="text"
            className="w-24"
            value={params.window?.count || ''}
            onChange={(e) => updateParams({
              window: { ...params.window, count: parseInt(e.target.value) || undefined }
            })}
            placeholder={t('metricsParams:cumulative.countPlaceholder')}
          />
          <Select
            value={params.window?.granularity || ''}
            onValueChange={(value) => updateParams({
              window: { ...params.window, granularity: value }
            })}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('metricsParams:cumulative.selectTimeGranularity')} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TimeGranularity).map((granularity) => (
                <SelectItem key={granularity} value={granularity}>
                  {t(`metricsParams:granularity.${granularity}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default CumulativeMetricParams;
