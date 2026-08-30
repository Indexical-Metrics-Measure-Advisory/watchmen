import { Store } from "../../state/store";
import { severityBadge, categoryLabel, passRateClass, maskingStrategyLabel } from "../../utils/display";
import { getRuleStats, getPolicyStats, getObjectsForTopicName } from "../../services";

export const renderGovernPage = (store: Store) => {
	const rules = store.state.governRules;
	const policies = store.state.maskingPolicies;
	const terms = store.state.glossaryTerms;
	const ruleStats = getRuleStats(rules);
	const policyStats = getPolicyStats(policies);

	const objectChips = (topicName?: string): string => {
		if (!topicName) return "";
		const objects = getObjectsForTopicName(store.state.ontologyObjects, topicName, store.state.topics);
		return objects
			.map(
				(o) => `
			<button class="wm-obj-feed-chip" data-ontology-open="${o.id}" title="Open ${o.displayName} in Ontology">◆ ${o.displayName}</button>
		`,
			)
			.join("");
	};

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Governance</div>
			<div class="wm-page-hero-desc">Quality rules, masking policies and the business glossary — the trust layer that makes the Ontology safe to use</div>
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
						<div class="wm-rule-name">${r.name}${r.updatedBy ? `<span class="wm-provenance-badge" title="Modified by approved proposal">⟳ updated by ${r.updatedBy}</span>` : ""}</div>
						<div class="wm-rule-desc">${r.description}</div>
						${
							r.params
								? `<div class="wm-rule-params">${Object.entries(r.params)
										.map(
											([k, v]) => `
										<span class="wm-param-chip">${k}=${v}</span>
									`,
										)
										.join("")}</div>`
								: ""
						}
					</div>
					<div class="wm-rule-meta">
						${severityBadge(r.severity)}
						<span class="wm-rule-category">${categoryLabel(r.category)}</span>
						${r.targetTopic ? `<span class="wm-rule-topic">${r.targetTopic}</span>` : ""}
						${objectChips(r.targetTopic)}
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
					<div class="wm-masking-objects">${objectChips(mp.targetTopic)}</div>
				</div>
				`,
						)
						.join("")}
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Business Glossary</div>
				<div class="wm-section-hint">${terms.length} terms anchor business meaning to ontology objects</div>
			</div>
			<div class="wm-glossary-list">
				${terms
					.map(
						(t) => `
				<div class="wm-glossary-row">
					<span class="wm-glossary-name">${t.displayName}</span>
					<span class="wm-term-status ${t.status}">${t.status}</span>
					<span class="wm-glossary-def">${t.definition}</span>
					<span class="wm-glossary-category">${t.category}</span>
				</div>
				${t.relatedObjectIds
					.map((id) => {
						const obj = store.state.ontologyObjects.find((o) => o.id === id);
						if (!obj) return "";
						return `<button class="wm-obj-feed-chip" data-ontology-open="${obj.id}" title="Open ${obj.displayName} in Ontology">◆ ${obj.displayName}</button>`;
					})
					.join("")}
			`,
					)
					.join("")}
			</div>
		</div>
	</div>`;
};
