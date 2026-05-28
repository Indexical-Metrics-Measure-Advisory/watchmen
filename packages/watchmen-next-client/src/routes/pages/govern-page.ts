import { Store } from "../../state/store";
import { severityBadge, categoryLabel, passRateClass, maskingStrategyLabel } from "../../utils/display";
import { getRuleStats, getPolicyStats } from "../../services";

export const renderGovernPage = (store: Store) => {
	const rules = store.state.governRules;
	const policies = store.state.maskingPolicies;
	const ruleStats = getRuleStats(rules);
	const policyStats = getPolicyStats(policies);

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Governance</div>
			<div class="wm-page-hero-desc">Manage quality rules, masking policies, and data security</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${ruleStats.total}</div>
					<div class="wm-hero-kpi-label">Quality Rules</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${ruleStats.avgPassRate}%</div>
					<div class="wm-hero-kpi-label">Avg Pass Rate</div>
				</div>
				<div class="wm-hero-kpi red">
					<div class="wm-hero-kpi-val">${ruleStats.critical}</div>
					<div class="wm-hero-kpi-label">Critical Rules</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${policyStats.enabled}</div>
					<div class="wm-hero-kpi-label">Active Masks</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Quality Rules</div>
				<div class="wm-section-hint">${ruleStats.enabled} active · ${ruleStats.disabled} disabled</div>
			</div>
			<div class="wm-rule-list">
				${rules
					.map(
						(r) => `
				<div class="wm-rule-row ${r.enabled ? "" : "disabled"}">
					<div class="wm-rule-main">
						<div class="wm-rule-name">${r.name}</div>
						<div class="wm-rule-desc">${r.description}</div>
					</div>
					<div class="wm-rule-meta">
						${severityBadge(r.severity)}
						<span class="wm-rule-category">${categoryLabel(r.category)}</span>
						${r.targetTopic ? `<span class="wm-rule-topic">${r.targetTopic}</span>` : ""}
					</div>
					<div class="wm-rule-status">
						${r.passRate != null ? `<span class="wm-pass-rate ${passRateClass(r.passRate)}">${r.passRate}%</span>` : ""}
						${r.lastChecked ? `<span class="wm-rule-checked">Checked ${r.lastChecked.slice(11, 19)}</span>` : ""}
					</div>
				</div>
				`,
					)
					.join("")}
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Masking Policies</div>
				<div class="wm-section-hint">${policies.length} policies · field-level data protection</div>
			</div>
			<div class="wm-masking-grid">
				${policies
					.map(
						(mp) => `
				<div class="wm-masking-card ${mp.enabled ? "" : "disabled"}">
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
						${mp.appliesTo.map((r) => `<span class="wm-masking-role">${r}</span>`).join("")}
					</div>
				</div>
				`,
					)
					.join("")}
			</div>
		</div>
	</div>`;
};
