import type { TFunction } from 'i18next';
import type { MetricDefinition, MetricTypeParams } from '@/model/metricsManagement';

export const normalizeMeasure = (measure?: MetricTypeParams['measure']) => {
  return {
    name: measure?.name ?? '',
    join_to_timespine: measure?.join_to_timespine ?? false,
    filter: measure?.filter ?? '',
    alias: measure?.alias ?? '',
    fill_nulls_with: measure?.fill_nulls_with ?? undefined,
  };
};

export const getTypeLabel = (type?: string, t?: TFunction) => {
  if (!type) return '';
  return t ? t(`metricsEnum:types.${type}`, type) : type;
};

export const getFormatLabel = (format?: string, t?: TFunction) => {
  if (!format) return t ? t('metricsEnum:formats.number') : 'number';
  return t ? t(`metricsEnum:formats.${format}`, format) : format;
};

export const validateForm = (form: Partial<MetricDefinition>, metricNamePattern: RegExp, t: TFunction): string[] => {
  const errors: string[] = [];

  if (!form.name?.trim()) {
    errors.push(t('metricsManagement:validation.metricNameRequired'));
  } else if (!metricNamePattern.test(form.name.trim())) {
    errors.push(t('metricsManagement:validation.metricNamePattern'));
  }

  if (!form.label?.trim()) {
    errors.push(t('metricsManagement:validation.metricLabelRequired'));
  }

  if (!form.description?.trim()) {
    errors.push(t('metricsManagement:validation.metricDescriptionRequired'));
  }

  if (!form.type) {
    errors.push(t('metricsManagement:validation.metricTypeRequired'));
  }

  // 验证type_params
  if (form.type === 'simple' && !form.type_params?.measure?.name?.trim()) {
    errors.push(t('metricsManagement:validation.simpleMeasureRequired'));
  }

  if (form.type === 'ratio') {
    if (!form.type_params?.numerator?.name?.trim()) {
      errors.push(t('metricsManagement:validation.ratioNumeratorRequired'));
    }
    if (!form.type_params?.denominator?.name?.trim()) {
      errors.push(t('metricsManagement:validation.ratioDenominatorRequired'));
    }
  }

  if (form.type === 'derived') {
    if (!form.type_params?.expr?.trim()) {
      errors.push(t('metricsManagement:validation.derivedExpressionRequired'));
    }
    if (!form.type_params?.metrics || form.type_params.metrics.length === 0) {
      errors.push(t('metricsManagement:validation.derivedMetricReferenceRequired'));
    }
  }

  if (form.type === 'cumulative') {
    if (!form.type_params?.cumulative_type_params?.metric?.name) {
      errors.push(t('metricsManagement:validation.cumulativeBaseMetricRequired'));
    }
  }

  if (form.type === 'conversion') {
    if (!form.type_params?.conversion_type_params?.base_measure?.name && !form.type_params?.conversion_type_params?.base_metric?.name) {
      errors.push(t('metricsManagement:validation.conversionBaseRequired'));
    }
    if (!form.type_params?.conversion_type_params?.conversion_measure?.name && !form.type_params?.conversion_type_params?.conversion_metric?.name) {
      errors.push(t('metricsManagement:validation.conversionTargetRequired'));
    }
    if (!form.type_params?.conversion_type_params?.entity?.trim()) {
      errors.push(t('metricsManagement:validation.conversionEntityRequired'));
    }
  }

  return errors;
};

export const cleanTypeParams = (params: MetricTypeParams | undefined, type: string | undefined): MetricTypeParams | undefined => {
  if (!params) return undefined;

  // Helper to convert empty/undefined to null
  const toNull = (val: any) => (val === undefined || val === '' ? null : val);

  const cleaned: any = { ...params };

  // Clean window
  if (cleaned.window && (!cleaned.window.count || !cleaned.window.granularity)) {
    cleaned.window = null;
  }

  if (type === 'simple') {
    // Ensure specific structure for simple metrics
    cleaned.expr = null;
    cleaned.window = null;
    cleaned.numerator = null;
    cleaned.denominator = null;
    cleaned.grain_to_date = null;
    cleaned.metrics = [];
    cleaned.conversion_type_params = null;
    cleaned.cumulative_type_params = null;

    if (cleaned.measure) {
      // Clean measure fields
      cleaned.measure = {
        ...cleaned.measure,
        alias: toNull(cleaned.measure.alias),
        filter: toNull(cleaned.measure.filter),
        fill_nulls_with: toNull(cleaned.measure.fill_nulls_with),
      };

      // Populate input_measures
      if (cleaned.measure.name) {
        cleaned.input_measures = [{
          name: cleaned.measure.name,
          alias: cleaned.measure.alias,
          filter: cleaned.measure.filter,
          fill_nulls_with: cleaned.measure.fill_nulls_with,
          join_to_timespine: cleaned.measure.join_to_timespine,
        }];
      } else {
        cleaned.input_measures = [];
      }
    } else {
      cleaned.input_measures = [];
    }
  } else if (type === 'derived') {
    // Ensure specific structure for derived metrics
    cleaned.measure = null;
    cleaned.numerator = null;
    cleaned.denominator = null;
    cleaned.window = null;
    cleaned.grain_to_date = null;
    cleaned.conversion_type_params = null;
    cleaned.cumulative_type_params = null;

    // Clean metrics
    if (cleaned.metrics) {
      cleaned.metrics = cleaned.metrics.map((metric: any) => ({
        ...metric,
        alias: toNull(metric.alias),
        filter: toNull(metric.filter),
        offset_window: metric.offset_window ? {
          ...metric.offset_window,
          count: metric.offset_window.count || 0,
          granularity: metric.offset_window.granularity,
        } : null,
        offset_to_grain: toNull(metric.offset_to_grain),
      }));
    } else {
      cleaned.metrics = [];
    }

    // Clean input_measures
    if (cleaned.input_measures) {
      cleaned.input_measures = cleaned.input_measures.map((measure: any) => ({
        ...measure,
        alias: toNull(measure.alias),
        filter: toNull(measure.filter),
        fill_nulls_with: toNull(measure.fill_nulls_with),
      }));
    } else {
      cleaned.input_measures = [];
    }
  } else {
    // Clean conversion params if not conversion type
    if (type !== 'conversion') {
      cleaned.conversion_type_params = undefined;
    } else {
      // Clean nested window in conversion params if invalid
      if (cleaned.conversion_type_params?.window && (!cleaned.conversion_type_params.window.count || !cleaned.conversion_type_params.window.granularity)) {
        cleaned.conversion_type_params = {
          ...cleaned.conversion_type_params,
          window: undefined,
        };
      }
    }

    // Clean cumulative params if not cumulative type
    if (type !== 'cumulative') {
      cleaned.cumulative_type_params = undefined;
    } else {
      // Clean nested window in cumulative params if invalid
      if (cleaned.cumulative_type_params?.window && (!cleaned.cumulative_type_params.window.count || !cleaned.cumulative_type_params.window.granularity)) {
        cleaned.cumulative_type_params = {
          ...cleaned.cumulative_type_params,
          window: undefined,
        };
      }
    }
  }

  return cleaned;
};
