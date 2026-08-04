/**
 * Format a metric value by the display format configured on the metric
 * (number / currency / percentage). Falls back to the plain grouped number
 * when no format is configured.
 */
export const formatMetricValue = (value: number, format?: string): string => {
	if (format === 'currency') {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(value);
	}
	if (format === 'percentage') {
		return `${value.toFixed(1)}%`;
	}
	return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
