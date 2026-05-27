import {Store} from '../../state/store';
import {RuleCategory, Severity, MaskingPolicy} from '../../types';

const severityBadge = (s: Severity): string => {
	const map: Record<Severity, string> = {
		critical: '<span class="wm-severity-pill critical">Critical</span>',
		warning: '<span class="wm-severity-pill warning">Warning</span>',
		info: '<span class="wm-severity-pill info">Info</span>',
	};
	return map[s] || '';
};

const categoryLabel = (c: RuleCategory): string => {
	const map: Record<RuleCategory, string> = {
		freshness: 'Freshness',
		completeness: 'Completeness',
		validity: 'Validity',
		uniqueness: 'Uniqueness',
		consistency: 'Consistency',
	};
	return map[c] || c;
};

const passRateClass = (rate?: number): string => {
	if (rate == null) return '';
	if (rate >= 99) return 'pass-high';
	if (rate >= 95) return 'pass-mid';
	return 'pass-low';
};

const maskingStrategyLabel = (s: MaskingPolicy['strategy']): string => {
	const map: Record<string, string> = {
		sha256: 'SHA-256 Hash',
		partial_mask: 'Partial Mask',
		redact: 'Redact',
		tokenize: 'Tokenize',
	};
	return map[s] || s;
};

export const renderGovernPage = (store: Store) => {
	const rules = store.state.governRules;
	const policies = store.state.maskingPolicies;
	const enabledRules = rules.filter(r => r.enabled);
	const criticalRules = rules.filter(r => r.severity === 'critical');
	const avgPassRate = enabledRules.length > 0
		? Math.round(enabledRules.reduce((s, r) => s + (r.passRate || 0), 0) / enabledRules.length * 10) / 10
		: 0;

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Governance</div>
			<div class="wm-page-hero-desc">Manage quality rules, masking policies, and data security</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${rules.length}</div>
					<div class="wm-hero-kpi-label">Quality Rules</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${avgPassRate}%</div>
					<div class="wm-hero-kpi-label">Avg Pass Rate</div>
				</div>
				<div class="wm-hero-kpi red">
					<div class="wm-hero-kpi-val">${criticalRules.length}</div>
					<div class="wm-hero-kpi-label">Critical Rules</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${policies.filter(p => p.enabled).length}</div>
					<div class="wm-hero-kpi-label">Active Masks</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Quality Rules</div>
				<div class="wm-section-hint">${enabledRules.length} active · ${rules.filter(r => !r.enabled).length} disabled</div>
			</div>
			<div class="wm-rule-list">
				${rules.map(r => `
				<div class="wm-rule-row ${r.enabled ? '' : 'disabled'}">
					<div class="wm-rule-main">
						<div class="wm-rule-name">${r.name}</div>
						<div class="wm-rule-desc">${r.description}</div>
					</div>
					<div class="wm-rule-meta">
						${severityBadge(r.severity)}
						<span class="wm-rule-category">${categoryLabel(r.category)}</span>
						${r.targetTopic ? `<span class="wm-rule-topic">${r.targetTopic}</span>` : ''}
					</div>
					<div class="wm-rule-status">
						${r.passRate != null ? `<span class="wm-pass-rate ${passRateClass(r.passRate)}">${r.passRate}%</span>` : ''}
						${r.lastChecked ? `<span class="wm-rule-checked">Checked ${r.lastChecked.slice(11, 19)}</span>` : ''}
					</div>
				</div>
				`).join('')}
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Masking Policies</div>
				<div class="wm-section-hint">${policies.length} policies · field-level data protection</div>
			</div>
			<div class="wm-masking-grid">
				${policies.map(mp => `
				<div class="wm-masking-card ${mp.enabled ? '' : 'disabled'}">
					<div class="wm-masking-card-top">
						<div class="wm-masking-name">${mp.name}</div>
						<div class="wm-masking-strategy">${maskingStrategyLabel(mp.strategy)}</div>
					</div>
					<div class="wm-masking-target">
						<span class="wm-masking-topic">${mp.targetTopic}</span>
						<span class="wm-masking-arrow">→</span>
						<span class="wm-masking-factor">${mp.targetFactor}</span>
					</div>
					<div class="wm-masking-roles">
						${mp.appliesTo.map(r => `<span class="wm-masking-role">${r}</span>`).join('')}
					</div>
				</div>
				`).join('')}
			</div>
		</div>
	</div>`;
};