import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MeasureReference } from '@/model/metricsManagement';
import { normalizeMeasure } from '@/utils/metricFormUtils';
import { cn } from '@/lib/utils';

interface SimpleMetricParamsProps {
  measure?: MeasureReference;
  availableMeasures: { name: string; label: string; modelName: string }[];
  onChange: (measure: MeasureReference) => void;
}

/** Business-friendly params for simple metrics: one measure, technical fields collapsed */
const SimpleMetricParams: React.FC<SimpleMetricParamsProps> = ({ measure, availableMeasures, onChange }) => {
  const { t } = useTranslation('metricsManagement');
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const normalized = normalizeMeasure(measure);

  const updateMeasure = (updates: Partial<MeasureReference>) => {
    onChange({ ...normalizeMeasure(measure), ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('dialogs.measure')}</Label>
        <Select value={normalized.name || ''} onValueChange={(value) => updateMeasure({ name: value })}>
          <SelectTrigger><SelectValue placeholder={t('dialogs.selectMeasure')} /></SelectTrigger>
          <SelectContent>
            {availableMeasures.map((item, index) => (
              <SelectItem key={`${item.modelName}-${item.name}-${index}`} value={item.name}>
                {item.label} ({item.modelName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
          <span className="flex items-center gap-2">
            {t('dialogs.advancedOptions')}
            <span className="text-xs text-muted-foreground">{t('dialogs.advancedOptionsHint')}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', advancedOpen && 'rotate-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="!text-sm !font-normal">{t('dialogs.joinToTimespine')}</Label>
              <Switch
                checked={normalized.join_to_timespine}
                onCheckedChange={(checked) => updateMeasure({ join_to_timespine: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('dialogs.alias')}</Label>
              <Input
                value={normalized.alias}
                onChange={(e) => updateMeasure({ alias: e.target.value })}
                placeholder={t('dialogs.aliasPlaceholder')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('dialogs.fillNullsWith')}</Label>
              <Input
                type="number"
                value={normalized.fill_nulls_with ?? ''}
                onChange={(e) => updateMeasure({ fill_nulls_with: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder={t('dialogs.fillNullsPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('dialogs.filter')}</Label>
              <Textarea
                value={normalized.filter || ''}
                onChange={(e) => updateMeasure({ filter: e.target.value })}
                placeholder={t('dialogs.filterPlaceholder')}
                rows={2}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default SimpleMetricParams;
