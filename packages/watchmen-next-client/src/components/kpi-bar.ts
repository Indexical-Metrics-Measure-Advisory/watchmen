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
				<div class="wm-kpi-label">待确认事件</div>
				<div class="wm-kpi-value">${pending.length}</div>
				<div class="wm-kpi-sub">${criticalCount} 严重 · ${warningCount} 警告</div>
			</div>
			<div class="wm-kpi-card blue">
				<div class="wm-kpi-label">严重事件</div>
				<div class="wm-kpi-value">${criticalCount}</div>
				<div class="wm-kpi-sub">需要优先处理</div>
			</div>
			<div class="wm-kpi-card green">
				<div class="wm-kpi-label">今日已处理</div>
				<div class="wm-kpi-value">${processedToday}</div>
				<div class="wm-kpi-sub">已确认或拒绝</div>
			</div>
			<div class="wm-kpi-card gray">
				<div class="wm-kpi-label">Agent 置信度</div>
				<div class="wm-kpi-value">${pending.length > 0 ? Math.round(pending.reduce((sum, s) => sum + s.confidence, 0) / pending.length) : '—'}%</div>
				<div class="wm-kpi-sub">平均 AI 置信度</div>
			</div>
		</div>
	`;
};
