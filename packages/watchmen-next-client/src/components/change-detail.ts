import {Store} from '../state/store';
import {PerceiveScenario, PerceiveChangeItem} from '../models';
import {getAttributeGovernance} from '../services';
import {maskingStrategyLabel} from '../utils/display';
import {escapeHtml} from '../utils/format';

const severityLabel = (s: string) => {
	switch (s) {
		case 'critical': return '<span class="wm-detail-severity-badge critical">Critical</span>';
		case 'warning': return '<span class="wm-detail-severity-badge warning">Warning</span>';
		default: return '<span class="wm-detail-severity-badge info">Info</span>';
	}
};

const impactLabel = (impact: string) => {
	const map: Record<string, string> = {high: 'High', medium: 'Medium', low: 'Low'};
	return map[impact] || impact;
};

const calcChangePercent = (baseline: number, current: number): number => {
	if (baseline === 0) return current > 0 ? 100 : 0;
	return Math.round(((current - baseline) / baseline) * 100);
};

const renderMetricCard = (label: string, baseline: number, current: number, unit?: string) => {
	const change = calcChangePercent(baseline, current);
	const maxVal = Math.max(baseline, current);
	const baselineWidth = maxVal > 0 ? Math.round((baseline / maxVal) * 100) : 0;
	const currentWidth = maxVal > 0 ? Math.round((current / maxVal) * 100) : 0;
	const isUp = change >= 0;

	return `
		<div class="wm-metric-card">
			<div class="wm-metric-label">${label}</div>
			<div class="wm-metric-values">
				<span class="wm-metric-baseline">${baseline}<span class="wm-metric-unit">${unit || ''}</span></span>
				<span class="wm-metric-arrow">→</span>
				<span class="wm-metric-current">${current}<span class="wm-metric-unit">${unit || ''}</span></span>
			</div>
			<div class="wm-metric-bars">
				<div class="wm-bar-row">
					<span class="wm-bar-label">Base</span>
					<div class="wm-bar-track"><div class="wm-bar-fill baseline" style="width:${baselineWidth}%"></div></div>
				</div>
				<div class="wm-bar-row">
					<span class="wm-bar-label">Current</span>
					<div class="wm-bar-track"><div class="wm-bar-fill current" style="width:${currentWidth}%"></div></div>
				</div>
			</div>
			<div class="wm-metric-change ${isUp ? 'up' : 'down'}">
				${isUp ? '↑' : '↓'} ${Math.abs(change)}% change
			</div>
		</div>
	`;
};

const renderChangeItem = (item: PerceiveChangeItem) => `
	<div class="wm-change-item">
		<div class="wm-change-impact ${item.impact}">${impactLabel(item.impact)}</div>
		<div class="wm-change-info">
			<div class="wm-change-field">
				${item.field}
				${item.targetKind ? `<span class="wm-target-badge ${item.targetKind}">${escapeHtml(item.targetLabel || item.targetKind)}</span>` : ''}
			</div>
			<div class="wm-change-diff">
				<span class="old">${item.baseline}</span>
				<span class="arrow">→</span>
				<span class="new">${item.current}</span>
			</div>
		</div>
	</div>
`;

// Ontology side of the impact chain: which objects/attributes this proposal
// touches and what governance state those attributes currently have.
const renderOntologyImpact = (store: Store, scenario: PerceiveScenario): string => {
	const objectIds = scenario.affectedObjectIds || [];
	const attributes = scenario.affectedAttributes || [];
	if (objectIds.length === 0) return '';

	const objectsHtml = objectIds
		.map((objectId) => {
			const object = store.state.ontologyObjects.find((o) => o.id === objectId);
			if (!object) return '';
			const objectAttributes = attributes
				.filter((a) => a.startsWith(objectId + '.'))
				.map((a) => a.split('.')[1]);
			const otherPending = store.state.perceiveScenarios.filter(
				(s) => s.status === 'pending' && s.id !== scenario.id && (s.affectedObjectIds || []).includes(objectId),
			).length;

			const attrsHtml = objectAttributes
				.map((attrName) => {
					const attr = object.attributes.find((a) => a.name === attrName);
					if (!attr) {
						// Proposed attribute that does not exist in the ontology yet.
						return `<div class="wm-impact-attr"><span class="wm-impact-attr-name">+ ${escapeHtml(attrName)}</span><span class="wm-attr-gov-chip proposed">proposed</span></div>`;
					}
					const gov = getAttributeGovernance(attr, store.state.maskingPolicies);
					return `
						<div class="wm-impact-attr">
							<span class="wm-impact-attr-name">${escapeHtml(attr.label)}</span>
							${gov.qualityRules > 0 ? `<span class="wm-attr-gov-chip">${gov.qualityRules} rule${gov.qualityRules > 1 ? 's' : ''}</span>` : ''}
							${gov.masked ? `<span class="wm-attr-gov-chip mask${gov.maskEnabled ? '' : ' off'}">masked${gov.maskEnabled ? '' : ' off'}</span>` : ''}
							${gov.uncoveredSensitivity ? '<span class="wm-attr-gov-chip gap">unmasked</span>' : ''}
							${gov.glossary > 0 ? '<span class="wm-attr-gov-chip term">term</span>' : ''}
						</div>
					`;
				})
				.join('');

			return `
				<div class="wm-impact-object-card">
					<div class="wm-impact-object-head">
						<button class="wm-obj-feed-chip" data-ontology-open="${object.id}">◆ ${object.displayName}</button>
						${otherPending > 0 ? `<span class="wm-impact-pending">+${otherPending} other pending</span>` : ''}
					</div>
					${attrsHtml ? `<div class="wm-impact-attrs">${attrsHtml}</div>` : ''}
				</div>
			`;
		})
		.join('');

	return `
		<div class="wm-detail-subtitle">Ontology Impact</div>
		<div class="wm-impact-objects">${objectsHtml}</div>
	`;
};

// Governance side of the impact chain: quality rules (with live params),
// masking policies and glossary terms touched by this proposal.
const renderGovernanceImpact = (store: Store, scenario: PerceiveScenario): string => {
	const ruleIds = scenario.relatedRuleIds || [];
	const policyIds = scenario.relatedPolicyIds || [];
	const termIds = scenario.relatedTermIds || [];

	if (ruleIds.length + policyIds.length + termIds.length === 0) {
		return `
			<div class="wm-detail-subtitle">Governance Impact</div>
			<div class="wm-impact-empty">No governance impact — platform-level change only.</div>
		`;
	}

	const rulesHtml = ruleIds
		.map((ruleId) => {
			const rule = store.state.governRules.find((r) => r.ruleId === ruleId);
			if (!rule) return '';
			return `
				<div class="wm-impact-gov-row">
					<span class="wm-impact-gov-kind rule">RULE</span>
					<div class="wm-impact-gov-main">
						<div class="wm-impact-gov-name">${escapeHtml(rule.name)}</div>
						<div class="wm-impact-gov-meta">${escapeHtml(rule.targetTopic || '')}${rule.targetFactor ? ' · ' + escapeHtml(rule.targetFactor) : ''} · pass ${rule.passRate != null ? rule.passRate + '%' : '—'}</div>
						${rule.params ? `<div class="wm-impact-gov-params">${Object.entries(rule.params).map(([k, v]) => `<span class="wm-param-chip">${escapeHtml(k)}=${escapeHtml(v)}</span>`).join('')}</div>` : ''}
					</div>
				</div>
			`;
		})
		.join('');

	const policiesHtml = policyIds
		.map((policyId) => {
			const policy = store.state.maskingPolicies.find((p) => p.policyId === policyId);
			if (!policy) return '';
			return `
				<div class="wm-impact-gov-row">
					<span class="wm-impact-gov-kind policy">POLICY</span>
					<div class="wm-impact-gov-main">
						<div class="wm-impact-gov-name">${escapeHtml(policy.name)}</div>
						<div class="wm-impact-gov-meta">${escapeHtml(policy.targetTopic)} · ${escapeHtml(policy.targetFactor)} · ${maskingStrategyLabel(policy.strategy)}</div>
					</div>
					<span class="wm-attr-gov-chip ${policy.enabled ? 'mask' : 'gap'}">${policy.enabled ? 'enabled' : 'disabled'}</span>
				</div>
			`;
		})
		.join('');

	const termsHtml = termIds
		.map((termId) => {
			const term = store.state.glossaryTerms.find((t) => t.id === termId);
			if (!term) return '';
			// A proposal rewriting the definition while the term documents the old
			// behavior is surfaced as a definition conflict.
			const conflict = scenario.proposedChanges.some(
				(c) => c.effect?.kind === 'update_glossary_term' && c.effect.termId === termId,
			);
			return `
				<div class="wm-impact-gov-row">
					<span class="wm-impact-gov-kind term">TERM</span>
					<div class="wm-impact-gov-main">
						<div class="wm-impact-gov-name">${escapeHtml(term.displayName)}</div>
						<div class="wm-impact-gov-meta">${escapeHtml(term.definition)}</div>
					</div>
					${conflict ? '<span class="wm-conflict-badge">definition conflict</span>' : `<span class="wm-term-status ${term.status}">${term.status}</span>`}
				</div>
			`;
		})
		.join('');

	return `
		<div class="wm-detail-subtitle">Governance Impact</div>
		<div class="wm-impact-governance">${rulesHtml}${policiesHtml}${termsHtml}</div>
	`;
};

// Post-approval receipt: what this proposal already changed in
// governance/ontology state.
const renderAppliedEffects = (store: Store, scenario: PerceiveScenario): string => {
	const lines = scenario.proposedChanges
		.map((change) => {
			const effect = change.effect;
			if (!effect) return '';
			switch (effect.kind) {
				case 'update_rule_params': {
					const rule = store.state.governRules.find((r) => r.ruleId === effect.ruleId);
					const params = Object.entries(effect.params)
						.map(([k, v]) => `${k}=${v}`)
						.join(', ');
					return `Rule ${effect.ruleId}${rule ? ` (${rule.name})` : ''} → ${params}`;
				}
				case 'add_attribute':
					return `Attribute ${effect.attribute.name} → object ${effect.objectId}`;
				case 'add_masking_policy':
					return `Masking policy ${effect.policy.policyId} (${effect.policy.strategy}) created and enabled`;
				case 'update_glossary_term':
					return `Glossary term ${effect.termId} → ${effect.status || 'definition'} updated`;
				case 'add_glossary_term':
					return `Glossary term ${effect.term.id} created`;
				default:
					return '';
			}
		})
		.filter(Boolean);

	if (lines.length === 0) return '';

	return `
		<div class="wm-applied-effects">
			<div class="wm-applied-title">Applied effects</div>
			${lines.map((line) => `<div class="wm-applied-row"><span class="wm-applied-dot"></span>${escapeHtml(line)}</div>`).join('')}
			<div class="wm-applied-hint">Govern and Ontology now reflect these changes.</div>
		</div>
	`;
};

export const renderChangeDetail = (store: Store): string => {
	const {perceiveScenarios, selectedScenarioId} = store.state;

	if (!selectedScenarioId) {
		return `
			<div class="wm-empty-state">
				<div class="wm-empty-icon">🔍</div>
				<div class="wm-empty-text">Select a perception event to view details</div>
				<div class="wm-empty-sub">Click any event from the list above</div>
			</div>
		`;
	}

	const scenario = perceiveScenarios.find(s => s.id === selectedScenarioId);
	if (!scenario) return '';

	const isPending = scenario.status === 'pending';
	const isApproved = scenario.status === 'approved';
	const isRejected = scenario.status === 'rejected';

	const resolvedHtml = isApproved ? `
		<div class="wm-resolved-bar">
			<span class="wm-resolved-icon">✅</span>
			<div>
				<div class="wm-resolved-text"><strong>Approved</strong> — Suggested changes adopted</div>
				<div class="wm-resolved-desc">System will execute changes as recommended by the Agent</div>
			</div>
		</div>
		${renderAppliedEffects(store, scenario)}
	` : isRejected ? `
		<div class="wm-resolved-bar">
			<span class="wm-resolved-icon">❌</span>
			<div>
				<div class="wm-resolved-text"><strong>Rejected</strong> — Suggested changes ignored</div>
				<div class="wm-resolved-desc">Current configuration remains unchanged</div>
			</div>
		</div>
	` : '';

	return `
		<div class="wm-detail-panel">
			<div class="wm-detail-header">
				<div class="wm-detail-title-row">
					${severityLabel(scenario.severity)}
					<span class="wm-detail-title">${scenario.title}</span>
				</div>
				<div class="wm-detail-desc">${scenario.description}</div>
				<div class="wm-detail-meta">
					<span class="wm-detail-meta-item">📊 ${scenario.topicName}</span>
					<span class="wm-detail-meta-item">🕐 ${scenario.detectedAt}</span>
					<span class="wm-detail-meta-item">🤖 AI Confidence ${scenario.confidence}%</span>
					${renderAffectedObjectChips(store, scenario)}
				</div>
				${resolvedHtml}
			</div>

			<div class="wm-detail-body cols">
				<div class="wm-impact-col">
					<div>
						<div class="wm-detail-subtitle">Drift Metrics</div>
						<div class="wm-metrics-grid">
							${scenario.driftMetrics.map(m => renderMetricCard(m.label, m.baseline, m.current, m.unit)).join('')}
						</div>
					</div>
					<div>
						<div class="wm-detail-subtitle">Suggested Changes</div>
						<div class="wm-changes-list">
							${scenario.proposedChanges.map(renderChangeItem).join('')}
						</div>
					</div>
				</div>
				<div class="wm-impact-col">
					${renderOntologyImpact(store, scenario)}
					${renderGovernanceImpact(store, scenario)}
				</div>
			</div>

			${isPending ? `
				<div class="wm-action-bar">
					<div class="wm-confidence-score">
						AI Confidence <span class="wm-confidence-value">${scenario.confidence}%</span>
						${scenario.confidence >= 90 ? ' — High confidence, recommend approval' : ' — Medium confidence, manual review advised'}
					</div>
					<div class="wm-action-buttons">
						<button class="wm-btn wm-btn-ghost" data-action="reject" data-id="${scenario.id}">
							<span>✕</span> Reject
						</button>
						<button class="wm-btn wm-btn-primary" data-action="approve" data-id="${scenario.id}">
							<span>✓</span> Approve
						</button>
					</div>
				</div>
			` : ''}
		</div>
	`;
};

// Quick object chips in the meta row; the full impact chain lives in the body.
const renderAffectedObjectChips = (store: Store, scenario: PerceiveScenario): string => {
	const objectIds = scenario.affectedObjectIds || [];
	return objectIds
		.map((objectId) => {
			const object = store.state.ontologyObjects.find((o) => o.id === objectId);
			if (!object) return '';
			return `<button class="wm-obj-feed-chip" data-ontology-open="${object.id}" title="Open ${object.displayName} in Ontology">◆ affects ${object.displayName}</button>`;
		})
		.join('');
};
