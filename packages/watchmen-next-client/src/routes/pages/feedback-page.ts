import {Store} from '../../state/store';
import {logIcon} from '../../utils/display';
import {getAgentLogStats, getSortedLogs} from '../../services';

export const renderFeedbackPage = (store: Store) => {
	const logs = store.state.agentLogs;
	const stats = getAgentLogStats(logs);
	const sortedLogs = getSortedLogs(logs);

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Agent Feedback</div>
			<div class="wm-page-hero-desc">AI-powered detection, analysis and decision intelligence</div>
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
						<div class="wm-feedback-time">${log.timestamp}</div>
					</div>
					`;
				}).join("")}
			</div>
		</div>
	</div>`;
};