import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from 'react-i18next';
import { Category, InputMeasure, MetricDefinition, MetricTypeParams } from '@/model/metricsManagement';
import DerivedMetricParams from '@/components/DerivedMetricParams';
import CumulativeMetricParams from '@/components/metrics/CumulativeMetricParams';
import ConversionMetricParams from '@/components/metrics/ConversionMetricParams';
import SimpleMetricParams from '@/components/metrics/form/SimpleMetricParams';
import RatioMetricParams from '@/components/metrics/form/RatioMetricParams';
import { getFormatLabel } from '@/utils/metricFormUtils';
import { cn } from '@/lib/utils';

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

const METRIC_TYPES: MetricDefinition['type'][] = ['simple', 'ratio', 'derived', 'cumulative', 'conversion'];

const SectionTitle = ({ index, title }: { index: number; title: string }) => (
  <div className="flex items-center gap-2">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {index}
    </span>
    <h3 className="text-base font-semibold">{title}</h3>
  </div>
);

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

  const updateRatioSide = (side: 'numerator' | 'denominator', value: InputMeasure) => {
    setForm(prev => ({
      ...prev,
      type_params: { ...prev.type_params, [side]: value },
    }));
  };

  const isEdit = mode === 'edit';
  const dialogTitle = isEdit ? t('metricsManagement:dialogs.editTitle') : t('metricsManagement:dialogs.createTitle');
  const dialogDesc = isEdit ? t('metricsManagement:dialogs.editDescription') : t('metricsManagement:dialogs.createDescription');
  const saveLabel = isEdit ? t('common:saveChanges') : t('metricsManagement:createMetric');

  // Live business summary generated from the current form state
  const renderSummary = () => {
    const displayName = form.label || form.name;
    const placeholder = (
      <span className="text-muted-foreground">{t('metricsManagement:dialogs.summaryPlaceholder')}</span>
    );
    if (!displayName || !form.type) {
      return placeholder;
    }

    if (form.type === 'simple') {
      const measureName = form.type_params?.measure?.name;
      if (!measureName) return placeholder;
      const measureLabel = availableMeasures.find(m => m.name === measureName)?.label || measureName;
      return t('metricsManagement:dialogs.summarySimple', { name: displayName, measure: measureLabel });
    }

    if (form.type === 'ratio') {
      const numeratorName = form.type_params?.numerator?.name;
      const denominatorName = form.type_params?.denominator?.name;
      if (!numeratorName || !denominatorName) return placeholder;
      const numeratorLabel = allMetricsForSelect.find(m => m.name === numeratorName)?.label || numeratorName;
      const denominatorLabel = allMetricsForSelect.find(m => m.name === denominatorName)?.label || denominatorName;
      return t('metricsManagement:dialogs.summaryRatio', {
        name: displayName,
        numerator: numeratorLabel,
        denominator: denominatorLabel,
        format: getFormatLabel(form.format, t),
      });
    }

    if (form.type === 'derived') {
      const expr = form.type_params?.expr;
      if (!expr) return placeholder;
      return t('metricsManagement:dialogs.summaryDerived', { name: displayName, expr });
    }

    if (form.type === 'cumulative') {
      const metricName = form.type_params?.cumulative_type_params?.metric?.name;
      if (!metricName) return placeholder;
      const metricLabel = allMetricsForSelect.find(m => m.name === metricName)?.label || metricName;
      return t('metricsManagement:dialogs.summaryCumulative', { name: displayName, metric: metricLabel });
    }

    if (form.type === 'conversion') {
      const entity = form.type_params?.conversion_type_params?.entity;
      if (!entity) return placeholder;
      return t('metricsManagement:dialogs.summaryConversion', { name: displayName, entity });
    }

    return placeholder;
  };

  const renderTypeParams = () => {
    if (!form.type) {
      return (
        <div className="flex items-center justify-center rounded-md border border-dashed py-10 text-muted-foreground">
          <p>{t('metricsManagement:dialogs.selectTypeHint')}</p>
        </div>
      );
    }

    if (form.type === 'simple') {
      return (
        <SimpleMetricParams
          measure={form.type_params?.measure}
          availableMeasures={availableMeasures}
          onChange={(measure) => updateFormTypeParams({ ...form.type_params, measure })}
        />
      );
    }

    if (form.type === 'ratio') {
      return (
        <RatioMetricParams
          numerator={form.type_params?.numerator}
          denominator={form.type_params?.denominator}
          metrics={allMetricsForSelect}
          onChange={updateRatioSide}
        />
      );
    }

    if (form.type === 'derived') {
      return (
        <div className="space-y-2">
          <Label>{t('metricsManagement:dialogs.derivedParams')}</Label>
          <DerivedMetricParams
            params={form.type_params || {}}
            onChange={updateFormTypeParams}
          />
        </div>
      );
    }

    if (form.type === 'cumulative') {
      return (
        <div className="space-y-2">
          <Label>{t('metricsManagement:dialogs.cumulativeParams')}</Label>
          <CumulativeMetricParams
            params={form.type_params?.cumulative_type_params || {}}
            onChange={(params) => updateFormTypeParams({ ...form.type_params, cumulative_type_params: params })}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label>{t('metricsManagement:dialogs.conversionParams')}</Label>
        <ConversionMetricParams
          params={form.type_params?.conversion_type_params || {}}
          onChange={(params) => updateFormTypeParams({ ...form.type_params, conversion_type_params: params })}
        />
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

        {/* Live business summary */}
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <span className="mr-2 font-medium">{t('metricsManagement:dialogs.summaryTitle')}:</span>
          {renderSummary()}
        </div>

        <div className="mt-2 space-y-8">
          {/* Section 1: basic information */}
          <section className="space-y-6">
            <SectionTitle index={1} title={t('metricsManagement:dialogs.sectionBasicInfo')} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('metricsManagement:dialogs.displayLabel')}</Label>
                <Input
                  value={form.label || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder={t('metricsManagement:dialogs.displayLabelPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('metricsManagement:dialogs.displayLabelHint')}</p>
              </div>
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
          </section>

          <Separator />

          {/* Section 2: calculation method */}
          <section className="space-y-6">
            <SectionTitle index={2} title={t('metricsManagement:dialogs.sectionCalculation')} />
            <RadioGroup
              value={form.type || ''}
              onValueChange={(value) => setForm(prev => ({ ...prev, type: value as MetricDefinition['type'] }))}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {METRIC_TYPES.map((type) => (
                <label
                  key={type}
                  className={cn(
                    'cursor-pointer rounded-lg border p-4 transition-colors hover:border-primary/50',
                    form.type === type && 'border-primary bg-primary/5 ring-1 ring-primary'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{t(`metricsManagement:dialogs.typeOptions.${type}.name`)}</span>
                    <RadioGroupItem value={type} className="mt-0.5" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(`metricsManagement:dialogs.typeOptions.${type}.description`)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    {t(`metricsManagement:dialogs.typeOptions.${type}.example`)}
                  </p>
                </label>
              ))}
            </RadioGroup>

            {renderTypeParams()}
          </section>

          <Separator />

          {/* Section 3: display & category */}
          <section className="space-y-6">
            <SectionTitle index={3} title={t('metricsManagement:dialogs.sectionDisplay')} />
            <div className="grid grid-cols-2 gap-4">
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
          </section>
        </div>

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

export default MetricFormDialog;
