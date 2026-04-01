import {Store} from '../state/store';

export const renderKpiBar = (store: Store): string => {
	const {perceiveScenarios} = store.state;
	const pending = perceiveScenarios.filter(s => s.status === 'pending');
	const criticalCount = pending.filter(s => s.severity === 'critical').length;
	const warningCount = pending.filter(s => s.severity === 'warning').length;
	const processedToday = perceiveScenarios.filter(s => s.status !== 'pending').length;

	return `
		<div class="wm-kpi-bar">
			<div class="wm-kpi-card orange">
				<div class="wm-kpi-label">Pending Events</div>
				<div class="wm-kpi-value">${pending.length}</div>
				<div class="wm-kpi-sub">${criticalCount} Critical · ${warningCount} Warning</div>
			</div>
			<div class="wm-kpi-card blue">
				<div class="wm-kpi-label">Critical Events</div>
				<div class="wm-kpi-value">${criticalCount}</div>
				<div class="wm-kpi-sub">Requires priority handling</div>
			</div>
			<div class="wm-kpi-card green">
				<div class="wm-kpi-label">Processed Today</div>
				<div class="wm-kpi-value">${processedToday}</div>
				<div class="wm-kpi-sub">Approved or rejected</div>
			</div>
			<div class="wm-kpi-card gray">
				<div class="wm-kpi-label">Agent Confidence</div>
				<div class="wm-kpi-value">${pending.length > 0 ? Math.round(pending.reduce((sum, s) => sum + s.confidence, 0) / pending.length) : '—'}%</div>
				<div class="wm-kpi-sub">Average AI confidence</div>
			</div>
		</div>
	`;
};
