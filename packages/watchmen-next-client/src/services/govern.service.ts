import { GovernRule, MaskingPolicy } from "../models";

export const getRuleStats = (rules: GovernRule[]) => {
	const enabledRules = rules.filter(r => r.enabled);
	const avgPassRate = enabledRules.length > 0
		? Math.round(enabledRules.reduce((s, r) => s + (r.passRate || 0), 0) / enabledRules.length * 10) / 10
		: 0;

	return {
		total: rules.length,
		enabled: enabledRules.length,
		disabled: rules.filter(r => !r.enabled).length,
		critical: rules.filter(r => r.severity === 'critical').length,
		avgPassRate,
	};
};

export const getPolicyStats = (policies: MaskingPolicy[]) => {
	return {
		total: policies.length,
		enabled: policies.filter(p => p.enabled).length,
	};
};