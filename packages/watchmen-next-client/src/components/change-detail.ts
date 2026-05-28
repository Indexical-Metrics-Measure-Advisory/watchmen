import {Store} from '../state/store';
import {PerceiveScenario, PerceiveChangeItem} from '../models';

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
			<div class="wm-change-field">${item.field}</div>
			<div class="wm-change-diff">
				<span class="old">${item.baseline}</span>
				<span class="arrow">→</span>
				<span class="new">${item.current}</span>
			</div>
		</div>
	</div>
`;

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
				</div>
				${resolvedHtml}
			</div>

			<div class="wm-detail-body">
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
