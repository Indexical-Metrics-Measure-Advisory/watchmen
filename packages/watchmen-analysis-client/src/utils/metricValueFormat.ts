import type { MetricNumberFormat } from '@/model/metricsManagement';

/**
 * Infer an ISO 4217 currency code from a metric's display unit
 * (e.g. "HKD", "¥", "$"). Defaults to USD.
 */
export const inferCurrencyFromUnit = (unit?: string): string => {
	const u = (unit ?? '').toLowerCase();
	if (u.includes('hkd')) return 'HKD';
	if (u.includes('¥') || u.includes('cny') || u.includes('rmb')) return 'CNY';
	if (u.includes('$') || u.includes('usd')) return 'USD';
	return 'USD';
};

const MIN_DECIMAL_PLACES = 0;
const MAX_DECIMAL_PLACES = 6;

const clampDecimalPlaces = (decimalPlaces?: number): number | undefined => {
	if (decimalPlaces === undefined || decimalPlaces === null || Number.isNaN(decimalPlaces)) {
		return undefined;
	}
	return Math.min(MAX_DECIMAL_PLACES, Math.max(MIN_DECIMAL_PLACES, Math.round(decimalPlaces)));
};

// Compact notation for abbreviated large numbers (K/M/B)
const compactFormatter = (decimalPlaces: number | undefined): Intl.NumberFormat =>
	new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: decimalPlaces ?? 1,
	});

/**
 * Format a metric value by the display format configured on the metric
 * (number / currency / percentage) plus its number format options
 * (decimal places / thousands separator / K-M-B abbreviation).
 * Falls back to the plain grouped number when no format is configured.
 * Currency defaults to USD and falls back to plain number formatting when
 * the currency code is not supported by Intl.
 */
export const formatMetricValue = (
	value: number,
	format?: string,
	currency: string = 'USD',
	numberFormat?: MetricNumberFormat,
): string => {
	const decimalPlaces = clampDecimalPlaces(numberFormat?.decimalPlaces);
	const useGrouping = numberFormat?.useThousandSeparator !== false;

	// Abbreviation only applies to magnitudes, not to percentages
	if (format !== 'percentage' && numberFormat?.abbreviation && Math.abs(value) >= 1000) {
		const compact = compactFormatter(decimalPlaces).format(value);
		if (format === 'currency') {
			try {
				return new Intl.NumberFormat('en-US', {
					style: 'currency',
					currency,
					notation: 'compact',
					maximumFractionDigits: decimalPlaces ?? 1,
				}).format(value);
			} catch {
				return compact;
			}
		}
		return compact;
	}

	if (format === 'currency') {
		try {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency,
				minimumFractionDigits: decimalPlaces ?? 0,
				maximumFractionDigits: decimalPlaces ?? 0,
			}).format(value);
		} catch {
			return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
		}
	}
	if (format === 'percentage') {
		return `${value.toFixed(decimalPlaces ?? 1)}%`;
	}
	return value.toLocaleString(undefined, {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces ?? 2,
		useGrouping,
	});
};
