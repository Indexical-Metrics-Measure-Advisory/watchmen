import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetricDefinition, WindowParams } from '@/model/metricsManagement';
import { getFormatLabel } from '@/utils/metricFormUtils';

interface MetricDefinitionViewProps {
  metric: MetricDefinition;
  availableMeasures: { name: string; label: string; modelName: string }[];
  allMetricsForSelect: MetricDefinition[];
}

/** A single labelled row inside the definition card */
const DefinitionRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-4 px-4 py-2.5">
    <span className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</span>
    <div className="flex-1 text-sm min-w-0">{children}</div>
  </div>
);

/** Value shown as "Friendly Label (technical_name)" */
const NameValue: React.FC<{ label?: string; name?: string }> = ({ label, name }) => {
  if (!name) return <span className="text-muted-foreground">-</span>;
  const friendly = label && label !== name ? `${label} (${name})` : name;
  return <span className="break-words">{friendly}</span>;
};

/** A small chip for scalar attributes */
const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs">{children}</span>
);

/**
 * Business-friendly rendering of a metric definition: resolves technical
 * type_params into labelled rows (summary sentence + fields per metric type).
 */
const MetricDefinitionView: React.FC<MetricDefinitionViewProps> = ({
  metric,
  availableMeasures,
  allMetricsForSelect,
}) => {
  const { t } = useTranslation(['metricsManagement', 'metricsEnum', 'metricsParams']);
  const params = metric.type_params;

  const measureLabel = (name?: string) =>
    availableMeasures.find((m) => m.name === name)?.label || name;
  const metricLabel = (name?: string) => {
    if (!name) return name;
    const found = allMetricsForSelect.find((m) => m.name === name);
    return found?.label || name;
  };
  const anyLabel = (name?: string) => {
    if (!name) return name;
    return availableMeasures.find((m) => m.name === name)?.label
      || allMetricsForSelect.find((m) => m.name === name)?.label
      || name;
  };

  const granularityLabel = (granularity?: string) =>
    granularity ? t(`metricsParams:granularity.${granularity}`, granularity) : '';
  const formatWindow = (window?: WindowParams) => {
    if (!window?.count) return window?.window_string || '';
    return `${t('metricsParams:cumulative.recentPrefix')} ${window.count} ${granularityLabel(window.granularity)}`;
  };
  const yesNo = (value?: boolean) =>
    value ? t('metricsManagement:details.yes') : t('metricsManagement:details.no');

  // One-sentence business summary, consistent with the create/edit dialog
  const renderSummary = () => {
    const displayName = metric.label || metric.name;
    switch (metric.type) {
      case 'simple': {
        const measure = params?.measure?.name;
        return measure
          ? t('metricsManagement:dialogs.summarySimple', { name: displayName, measure: measureLabel(measure) })
          : t('metricsManagement:details.noDefinition');
      }
      case 'ratio':
        return t('metricsManagement:dialogs.summaryRatio', {
          name: displayName,
          numerator: metricLabel(params?.numerator?.name),
          denominator: metricLabel(params?.denominator?.name),
          format: getFormatLabel(metric.format, t),
        });
      case 'derived':
        return params?.expr
          ? t('metricsManagement:dialogs.summaryDerived', { name: displayName, expr: params.expr })
          : t('metricsManagement:details.noDefinition');
      case 'cumulative':
        return params?.cumulative_type_params?.metric?.name
          ? t('metricsManagement:dialogs.summaryCumulative', {
            name: displayName,
            metric: metricLabel(params.cumulative_type_params.metric?.name),
          })
          : t('metricsManagement:details.noDefinition');
      case 'conversion':
        return params?.conversion_type_params?.entity
          ? t('metricsManagement:dialogs.summaryConversion', {
            name: displayName,
            entity: params.conversion_type_params.entity,
          })
          : t('metricsManagement:details.noDefinition');
      default:
        return t('metricsManagement:details.noDefinition');
    }
  };

  const renderFields = () => {
    switch (metric.type) {
      case 'simple': {
        const measure = params?.measure;
        if (!measure?.name) return null;
        return (
          <>
            <DefinitionRow label={t('metricsManagement:dialogs.measure')}>
              <NameValue label={measureLabel(measure.name)} name={measure.name} />
            </DefinitionRow>
            {measure.alias && (
              <DefinitionRow label={t('metricsManagement:dialogs.alias')}>{measure.alias}</DefinitionRow>
            )}
            {measure.filter && (
              <DefinitionRow label={t('metricsManagement:dialogs.filter')}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{measure.filter}</code>
              </DefinitionRow>
            )}
            {measure.join_to_timespine && (
              <DefinitionRow label={t('metricsManagement:dialogs.joinToTimespine')}>
                <Chip>{yesNo(measure.join_to_timespine)}</Chip>
              </DefinitionRow>
            )}
            {measure.fill_nulls_with !== undefined && measure.fill_nulls_with !== null && (
              <DefinitionRow label={t('metricsManagement:dialogs.fillNullsWith')}>
                {measure.fill_nulls_with}
              </DefinitionRow>
            )}
          </>
        );
      }

      case 'ratio': {
        const numerator = params?.numerator;
        const denominator = params?.denominator;
        if (!numerator?.name && !denominator?.name) return null;
        return (
          <>
            <DefinitionRow label={t('metricsManagement:dialogs.numerator')}>
              <NameValue label={metricLabel(numerator?.name)} name={numerator?.name} />
            </DefinitionRow>
            <DefinitionRow label={t('metricsManagement:dialogs.denominator')}>
              <NameValue label={metricLabel(denominator?.name)} name={denominator?.name} />
            </DefinitionRow>
          </>
        );
      }

      case 'derived': {
        if (!params?.expr && !params?.metrics?.length && !params?.input_measures?.length) return null;
        return (
          <>
            {params.expr && (
              <DefinitionRow label={t('metricsManagement:details.expression')}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-words">{params.expr}</code>
              </DefinitionRow>
            )}
            {params.metrics && params.metrics.length > 0 && (
              <DefinitionRow label={t('metricsManagement:details.metricReferences')}>
                <div className="space-y-1.5">
                  {params.metrics.map((ref, idx) => (
                    <div key={`${ref.name}-${idx}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <NameValue label={metricLabel(ref.name)} name={ref.name} />
                      {ref.alias && <Chip>{t('metricsManagement:dialogs.alias')}: {ref.alias}</Chip>}
                      {ref.offset_window?.count ? (
                        <Chip>
                          {t('metricsManagement:details.offsetWindow')}: {formatWindow(ref.offset_window)}
                        </Chip>
                      ) : ref.offset_to_grain ? (
                        <Chip>
                          {t('metricsManagement:details.offsetWindow')}: {granularityLabel(ref.offset_to_grain)}
                        </Chip>
                      ) : null}
                    </div>
                  ))}
                </div>
              </DefinitionRow>
            )}
            {params.input_measures && params.input_measures.length > 0 && (
              <DefinitionRow label={t('metricsManagement:details.inputMeasures')}>
                <div className="flex flex-wrap gap-1.5">
                  {params.input_measures.map((m, idx) => (
                    <Chip key={`${m.name}-${idx}`}>{measureLabel(m.name)}</Chip>
                  ))}
                </div>
              </DefinitionRow>
            )}
          </>
        );
      }

      case 'cumulative': {
        const cumulative = params?.cumulative_type_params;
        if (!cumulative?.metric?.name && !cumulative?.window && !cumulative?.grain_to_date) return null;
        return (
          <>
            {cumulative.metric?.name && (
              <DefinitionRow label={t('metricsParams:cumulative.metric')}>
                <NameValue label={metricLabel(cumulative.metric.name)} name={cumulative.metric.name} />
              </DefinitionRow>
            )}
            {cumulative.window?.count ? (
              <DefinitionRow label={t('metricsManagement:details.timeWindow')}>
                <Chip>{formatWindow(cumulative.window)}</Chip>
              </DefinitionRow>
            ) : null}
            {cumulative.grain_to_date && (
              <DefinitionRow label={t('metricsManagement:details.grainToDate')}>
                <Chip>{granularityLabel(cumulative.grain_to_date)}</Chip>
              </DefinitionRow>
            )}
            {cumulative.period_agg && (
              <DefinitionRow label={t('metricsManagement:details.periodAggregation')}>
                <Chip>{t(`metricsEnum:aggregation.${cumulative.period_agg}`, cumulative.period_agg)}</Chip>
              </DefinitionRow>
            )}
          </>
        );
      }

      case 'conversion': {
        const conversion = params?.conversion_type_params;
        if (!conversion) return null;
        const base = conversion.base_measure?.name || conversion.base_metric?.name;
        const target = conversion.conversion_measure?.name || conversion.conversion_metric?.name;
        if (!base && !target && !conversion.entity) return null;
        return (
          <>
            {conversion.entity && (
              <DefinitionRow label={t('metricsManagement:details.entity')}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{conversion.entity}</code>
              </DefinitionRow>
            )}
            {base && (
              <DefinitionRow label={t('metricsManagement:details.baseComponent')}>
                <NameValue label={anyLabel(base)} name={base} />
              </DefinitionRow>
            )}
            {target && (
              <DefinitionRow label={t('metricsManagement:details.conversionComponent')}>
                <NameValue label={anyLabel(target)} name={target} />
              </DefinitionRow>
            )}
            {conversion.calculation && (
              <DefinitionRow label={t('metricsManagement:dialogs.sectionCalculation')}>
                <Chip>{t(`metricsEnum:calculation.${conversion.calculation}`, conversion.calculation)}</Chip>
              </DefinitionRow>
            )}
            {conversion.window?.count ? (
              <DefinitionRow label={t('metricsManagement:details.timeWindow')}>
                <Chip>{formatWindow(conversion.window)}</Chip>
              </DefinitionRow>
            ) : null}
            {conversion.constant_properties && conversion.constant_properties.length > 0 && (
              <DefinitionRow label={t('metricsParams:conversion.constantProperties')}>
                <div className="flex flex-wrap gap-1.5">
                  {conversion.constant_properties.map((prop, idx) => (
                    <Chip key={`${prop.property}-${idx}`}>
                      {prop.property}: {prop.value}
                    </Chip>
                  ))}
                </div>
              </DefinitionRow>
            )}
          </>
        );
      }

      default:
        return null;
    }
  };

  const fields = renderFields();

  return (
    <div className="space-y-3">
      {/* Business summary sentence */}
      <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <span className="mr-2 font-medium">{t('metricsManagement:dialogs.summaryTitle')}:</span>
        {renderSummary()}
      </div>

      {/* Structured definition fields */}
      {fields ? (
        <div className="rounded-lg border divide-y">
          {fields}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('metricsManagement:details.noDefinition')}</p>
      )}
    </div>
  );
};

export default MetricDefinitionView;
