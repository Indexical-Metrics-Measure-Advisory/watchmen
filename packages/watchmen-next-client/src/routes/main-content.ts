import {renderPerceptionLayer, renderPerceptionOverview} from '../components/perception';
import {Store} from '../state/store';

export const renderMainContent = (store: Store) => {
	const {state, data} = store;
	if (state.main === 'overview') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Watchmen Control Plane</h3>
	<div class="wm-flow">
		<div class="wm-flow-item">Reality</div>
		<div class="wm-flow-item">Perception</div>
		<div class="wm-flow-item">Drift Detection</div>
		<div class="wm-flow-item">Incident</div>
		<div class="wm-flow-item">Human/AI Decision</div>
		<div class="wm-flow-item">Action</div>
		<div class="wm-flow-item">System Update</div>
	</div>
	<div style="height: 10px"></div>
	<div class="wm-list-item">Watchmen UI = 数据世界的“监控 + 审计 + 决策控制台”</div>
</div>
${renderPerceptionOverview()}`;
	}
	if (state.main === 'perception') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Perception Center</h3>
	<div class="wm-tabs">
		<button class="wm-tab ${state.perception === 'overview' ? 'active' : ''}" data-perception="overview">Overview</button>
		<button class="wm-tab ${state.perception === 'structural' ? 'active' : ''}" data-perception="structural">Structural</button>
		<button class="wm-tab ${state.perception === 'statistical' ? 'active' : ''}" data-perception="statistical">Statistical</button>
		<button class="wm-tab ${state.perception === 'behavior' ? 'active' : ''}" data-perception="behavior">Behavior</button>
		<button class="wm-tab ${state.perception === 'semantic' ? 'active' : ''}" data-perception="semantic">Semantic</button>
	</div>
</div>
${renderPerceptionLayer(state)}`;
	}
	if (state.main === 'incidents') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Incident Center</h3>
	<div class="wm-list">
		${data.incidents.map(incident => `
		<div class="wm-list-item">
			<div><strong>${incident.id}</strong> · ${incident.type} <span class="wm-badge high">${incident.impact}</span></div>
			<div class="wm-mini">Affected: ${incident.affected.join(', ')}</div>
			<div class="wm-mini">Root Cause: ${incident.rootCause}</div>
			<div class="wm-mini">Suggested: ${incident.suggestedActions.join(' · ')}</div>
			<div class="wm-btn-group">
				<button class="wm-btn">Assign</button>
				<button class="wm-btn">Resolve</button>
				<button class="wm-btn investigate">Trigger Workflow</button>
			</div>
		</div>`).join('')}
	</div>
</div>`;
	}
	if (state.main === 'actions') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Action Center</h3>
	<div class="wm-list">
		${data.actions.map(item => `
			<div class="wm-list-item">
				<div><strong>Trigger:</strong> ${item.trigger}</div>
				<div class="wm-mini"><strong>Actions:</strong> ${item.actions.join(' · ')}</div>
			</div>
		`).join('')}
	</div>
</div>`;
	}
	if (state.main === 'rules') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Rules & Semantics</h3>
	<div class="wm-list-item"><strong>Entity:</strong> Policy</div>
	<div class="wm-list-item"><strong>Attributes:</strong> premium (monetary), status (enum)</div>
	<div class="wm-list-item"><strong>Rules:</strong> premium > 0, must_have customer_id</div>
	<div class="wm-btn-group">
		<button class="wm-btn">YAML Mode</button>
		<button class="wm-btn">UI Mode</button>
		<button class="wm-btn investigate">AI 生成规则</button>
	</div>
</div>`;
	}
	return `
<div class="wm-card">
	<h3 class="wm-title">${data.mainNav.find(item => item.key === state.main)?.label}</h3>
	<div class="wm-list-item">该模块已纳入控制平面，当前展示为可产品化原型占位。</div>
</div>`;
};
