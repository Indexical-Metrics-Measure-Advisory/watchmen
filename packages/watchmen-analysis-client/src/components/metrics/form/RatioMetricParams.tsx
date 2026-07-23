import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InputMeasure, MetricDefinition } from '@/model/metricsManagement';
import { cn } from '@/lib/utils';

interface RatioMetricParamsProps {
  numerator?: InputMeasure;
  denominator?: InputMeasure;
  metrics: MetricDefinition[];
  onChange: (side: 'numerator' | 'denominator', value: InputMeasure) => void;
}

/** Business-friendly params for ratio metrics: pick two metrics, technical fields collapsed */
const RatioMetricParams: React.FC<RatioMetricParamsProps> = ({ numerator, denominator, metrics, onChange }) => {
  const { t } = useTranslation('metricsManagement');
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const simpleMetrics = metrics.filter(m => m.type === 'simple');

  const updateSide = (side: 'numerator' | 'denominator', current: InputMeasure | undefined, updates: Partial<InputMeasure>) => {
    onChange(side, {
      name: current?.name ?? '',
      join_to_timespine: current?.join_to_timespine ?? false,
      filter: current?.filter,
      alias: current?.alias,
      fill_nulls_with: current?.fill_nulls_with,
      ...updates,
    });
  };

  const renderMetricSelect = (side: 'numerator' | 'denominator', current: InputMeasure | undefined, label: string, placeholder: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={current?.name || ''} onValueChange={(value) => updateSide(side, current, { name: value })}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {simpleMetrics.map((m) => (
            <SelectItem key={m.name} value={m.name}>{m.label || m.name} ({m.name})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const numeratorMetric = simpleMetrics.find(m => m.name === numerator?.name);
  const denominatorMetric = simpleMetrics.find(m => m.name === denominator?.name);

  const renderSideAdvanced = (side: 'numerator' | 'denominator', current: InputMeasure | undefined, label: string) => (
    <div className="space-y-4 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="space-y-2">
        <Label>{t('dialogs.alias')}</Label>
        <Input
          value={current?.alias || ''}
          onChange={(e) => updateSide(side, current, { alias: e.target.value })}
          placeholder={t('dialogs.aliasPlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('dialogs.filter')}</Label>
        <Textarea
          value={current?.filter || ''}
          onChange={(e) => updateSide(side, current, { filter: e.target.value })}
          placeholder={t('dialogs.filterPlaceholder')}
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {renderMetricSelect('numerator', numerator, t('dialogs.numerator'), t('dialogs.selectNumerator'))}
        {renderMetricSelect('denominator', denominator, t('dialogs.denominator'), t('dialogs.selectDenominator'))}
      </div>

      {numerator?.name && denominator?.name && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">{t('dialogs.formulaPreview')}: </span>
          <span className="font-medium">
            {numeratorMetric?.label || numerator.name} ÷ {denominatorMetric?.label || denominator.name}
          </span>
        </div>
      )}

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
          <span className="flex items-center gap-2">
            {t('dialogs.advancedOptions')}
            <span className="text-xs text-muted-foreground">{t('dialogs.advancedOptionsHint')}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', advancedOpen && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-2 gap-4 pt-4">
          {renderSideAdvanced('numerator', numerator, t('dialogs.numerator'))}
          {renderSideAdvanced('denominator', denominator, t('dialogs.denominator'))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default RatioMetricParams;
