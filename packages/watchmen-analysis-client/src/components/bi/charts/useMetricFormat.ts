import { useEffect, useState } from 'react';
import { getMetrics } from '@/services/metricsManagementService';
import { inferCurrencyFromUnit } from '@/utils/metricValueFormat';
import type { MetricNumberFormat } from '@/model/metricsManagement';

/**
 * Resolve the display label / format / unit / number format configured on a metric
 * (BIChartCard.metricId is the metric name). The metric list is fetched once and
 * cached at module level, so every chart card on a dashboard shares a single request.
 */

type MetricDisplayInfo = { label?: string; format?: string; unit?: string; numberFormat?: MetricNumberFormat };
type DisplayMap = Record<string, MetricDisplayInfo | undefined>;

let cache: DisplayMap | null = null;
let pending: Promise<DisplayMap> | null = null;

const loadDisplayInfo = (): Promise<DisplayMap> => {
	if (cache) {
		return Promise.resolve(cache);
	}
	pending ??= getMetrics()
		.then(metrics => {
			const map: DisplayMap = {};
			metrics.forEach(m => {
				if (m.name && (m.label || m.format || m.unit || m.config?.numberFormat)) {
					map[m.name] = { label: m.label, format: m.format, unit: m.unit, numberFormat: m.config?.numberFormat };
				}
			});
			cache = map;
			return map;
		})
		.catch(e => {
			console.warn('[useMetricFormat] failed to load metric display info', e);
			cache = {};
			return cache;
		})
		.finally(() => {
			pending = null;
		});
	return pending;
};

const pickLabel = (info: MetricDisplayInfo | undefined) => info?.label;
const pickFormat = (info: MetricDisplayInfo | undefined) => info?.format;
const pickUnit = (info: MetricDisplayInfo | undefined) => info?.unit;
const pickNumberFormat = (info: MetricDisplayInfo | undefined) => info?.numberFormat;
const pickCurrency = (info: MetricDisplayInfo | undefined) => inferCurrencyFromUnit(info?.unit);

const useMetricDisplayField = <T,>(metricId: string | undefined, pick: (info: MetricDisplayInfo | undefined) => T): T | undefined => {
	const [value, setValue] = useState<T | undefined>(() => (metricId && cache ? pick(cache[metricId]) : undefined));

	useEffect(() => {
		if (!metricId) {
			return;
		}
		let cancelled = false;
		loadDisplayInfo().then(map => {
			if (!cancelled) {
				setValue(pick(map[metricId]));
			}
		});
		return () => {
			cancelled = true;
		};
	}, [metricId, pick]);

	return value;
};

export const useMetricLabel = (metricId?: string): string | undefined => useMetricDisplayField(metricId, pickLabel);

export const useMetricFormat = (metricId?: string): string | undefined => useMetricDisplayField(metricId, pickFormat);

export const useMetricUnit = (metricId?: string): string | undefined => useMetricDisplayField(metricId, pickUnit);

/** Number format options stored under the metric's config.numberFormat. */
export const useMetricNumberFormat = (metricId?: string): MetricNumberFormat | undefined => useMetricDisplayField(metricId, pickNumberFormat);

/** Currency code inferred from the metric's display unit (defaults to USD). */
export const useMetricCurrency = (metricId?: string): string | undefined => useMetricDisplayField(metricId, pickCurrency);
