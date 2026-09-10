/**
 * Centralized chart color palette for the data-quality module.
 *
 * ECharts (and raw canvas/svg) cannot consume CSS variables, so chart colors must
 * be literal values. The constants below are aligned with the theme CSS variables
 * (see comments) — when the theme palette changes, update here accordingly.
 * Prefer CSS variables over these constants wherever a styled-component can be used.
 */
import {MonitorRuleSeverity} from '@/services/data/data-quality/rule-types';
import {PiiSensitivityLevel} from '@/services/data/data-quality/pii-types';

/** quality score bands, aligned with --success-color / --warn-color / --danger-color */
export const SCORE_BAND_COLORS = {
	excellent: 'rgb(46,158,99)', // ~ --success-color
	good: 'rgb(77,107,254)', // ~ --primary-color
	fair: 'rgb(216,144,31)', // ~ --warn-color
	poor: 'rgb(214,69,69)' // ~ --danger-color
};

/** rule severity colors */
export const SEVERITY_COLORS: Record<string, string> = {
	[MonitorRuleSeverity.FATAL]: 'rgb(214,69,69)', // ~ --danger-color
	[MonitorRuleSeverity.WARN]: 'rgb(216,144,31)', // ~ --warn-color
	[MonitorRuleSeverity.TRACE]: 'rgb(77,107,254)' // ~ --primary-color
};

/** neutral series color, ~ --font-color with reduced opacity */
export const NEUTRAL_COLOR = 'rgb(145,152,163)';

/** primary accent, ~ --primary-color */
export const ACCENT_COLOR = 'rgb(77,107,254)';

/** pipeline / flow accent, teal */
export const PIPELINE_COLOR = 'rgb(13,115,119)';

/** PII sensitivity level colors */
export const PII_LEVEL_COLORS: Record<string, string> = {
	[PiiSensitivityLevel.LEVEL_1]: 'rgb(222,89,99)', // ~ --danger-color
	[PiiSensitivityLevel.LEVEL_2]: 'rgb(255,161,0)' // ~ --warn-color
};

/** default echarts series palette for pies/bars in this module */
export const SERIES_COLORS = [
	'rgb(77,107,254)',
	'rgb(46,158,99)',
	'rgb(255,161,0)',
	'rgb(222,89,99)',
	'rgb(126,87,194)',
	'rgb(13,115,119)',
	'rgb(145,152,163)'
];

/** grid/axis split color that works on both light and dark themes */
export const CHART_SPLIT_COLOR = 'rgba(128,128,128,0.2)';

/** five quality dimension radar colors, one per dimension */
export const DIMENSION_COLORS = [
	'rgb(77,107,254)',
	'rgb(46,158,99)',
	'rgb(255,161,0)',
	'rgb(126,87,194)',
	'rgb(13,115,119)'
];
