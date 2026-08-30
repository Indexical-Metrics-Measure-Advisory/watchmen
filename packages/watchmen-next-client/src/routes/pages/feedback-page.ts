import {Store} from '../../state/store';
import {logIcon} from '../../utils/display';
import {getAgentLogStats, getSortedLogs} from '../../services';

export const renderFeedbackPage = (store: Store) => {
	const logs = store.state.agentLogs;
	const stats = getAgentLogStats(logs);
	const sortedLogs = getSortedLogs(logs);

	// Ontology linkage: resolve the first affected object of the related proposal.
	const objectChip = (scenarioId?: string): string => {
		if (!scenarioId) return "";
		const scenario = store.state.perceiveScenarios.find((s) => s.id === scenarioId);
		const objectId = (scenario?.affectedObjectIds || [])[0];
		if (!objectId) return "";
		const object = store.state.ontologyObjects.find((o) => o.id === objectId);
		if (!object) return "";
		return `<button class="wm-obj-feed-chip" data-ontology-open="${object.id}" title="Open ${object.displayName} in Ontology">◆ ${object.displayName}</button>`;
	};

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Agent Feedback</div>
			<div class="wm-page-hero-desc">Human-in-the-loop decisions that teach the Agent to build a better Ontology</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.total}</div>
					<div class="wm-hero-kpi-label">Total Events</div>
				</div>
				<div class="wm-hero-kpi orange">
					<div class="wm-hero-kpi-val">${stats.detected}</div>
					<div class="wm-hero-kpi-label">Detected</div>
				</div>
				<div class="wm-hero-kpi blue">
					<div class="wm-hero-kpi-val">${stats.analyzed}</div>
					<div class="wm-hero-kpi-label">Analyzed</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${stats.actions}</div>
					<div class="wm-hero-kpi-label">Actions</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Decision Log</div>
				<div class="wm-section-hint">AI agent detection, analysis and user actions</div>
			</div>
			<div class="wm-feedback-list">
				${sortedLogs.map(log => {
					const meta = logIcon(log.action);
					return `
					<div class="wm-feedback-row ${meta.cls}">
						<div class="wm-feedback-icon">${meta.icon}</div>
						<div class="wm-feedback-body">
							<div class="wm-feedback-content">${log.content}</div>
						</div>
						${objectChip(log.scenarioId)}
						<div class="wm-feedback-time">${log.timestamp}</div>
					</div>
					`;
				}).join("")}
			</div>
		</div>
	</div>`;
};