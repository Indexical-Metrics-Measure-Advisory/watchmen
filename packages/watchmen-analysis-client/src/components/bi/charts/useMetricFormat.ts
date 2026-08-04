import { useEffect, useState } from 'react';
import { getMetrics } from '@/services/metricsManagementService';

/**
 * Resolve the display format configured on a metric (BIChartCard.metricId is the
 * metric name). The metric list is fetched once and cached at module level, so
 * every chart card on a dashboard shares a single request.
 */

type FormatMap = Record<string, string | undefined>;

let cache: FormatMap | null = null;
let pending: Promise<FormatMap> | null = null;

const loadFormats = (): Promise<FormatMap> => {
	if (cache) {
		return Promise.resolve(cache);
	}
	pending ??= getMetrics()
		.then(metrics => {
			const map: FormatMap = {};
			metrics.forEach(m => {
				if (m.name && m.format) {
					map[m.name] = m.format;
				}
			});
			cache = map;
			return map;
		})
		.catch(e => {
			console.warn('[useMetricFormat] failed to load metric formats', e);
			cache = {};
			return cache;
		})
		.finally(() => {
			pending = null;
		});
	return pending;
};

export const useMetricFormat = (metricId?: string): string | undefined => {
	const [format, setFormat] = useState<string | undefined>(() => (metricId && cache ? cache[metricId] : undefined));

	useEffect(() => {
		if (!metricId) {
			return;
		}
		let cancelled = false;
		loadFormats().then(map => {
			if (!cancelled) {
				setFormat(map[metricId]);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [metricId]);

	return format;
};
