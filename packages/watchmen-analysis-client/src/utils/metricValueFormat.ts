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

/**
 * Format a metric value by the display format configured on the metric
 * (number / currency / percentage). Falls back to the plain grouped number
 * when no format is configured. Currency defaults to USD and falls back to
 * plain number formatting when the currency code is not supported by Intl.
 */
export const formatMetricValue = (value: number, format?: string, currency: string = 'USD'): string => {
	if (format === 'currency') {
		try {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency,
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}).format(value);
		} catch {
			return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
		}
	}
	if (format === 'percentage') {
		return `${value.toFixed(1)}%`;
	}
	return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
