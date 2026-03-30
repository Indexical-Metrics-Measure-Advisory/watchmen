import {Store} from '../state/store';
import {escapeHtml} from '../utils/format';
import {WorkflowTask, DataSource, Topic, Pipeline} from '../types';

const renderWorkflowCard = (task: WorkflowTask) => `
<div class="wm-list-item">
	<div><strong>${escapeHtml(task.title)}</strong> <span class="wm-badge ${task.status === 'completed' ? 'low' : task.status === 'in_progress' ? 'medium' : 'high'}">${task.status.toUpperCase()}</span></div>
	<div class="wm-mini">${escapeHtml(task.description)}</div>
</div>
`;

const renderDataSourceCard = (ds: DataSource) => `
<div class="wm-list-item">
	<div style="display:flex; justify-content: space-between; align-items: center;">
		<strong>${escapeHtml(ds.name)}</strong>
		<span class="wm-badge low">${ds.dataSourceType.toUpperCase()}</span>
	</div>
	<div class="wm-mini">Code: ${ds.dataSourceCode} | Host: ${ds.host || 'N/A'}</div>
</div>
`;

const renderTopicCard = (topic: Topic) => `
<div class="wm-list-item">
	<div style="display:flex; justify-content: space-between; align-items: center;">
		<strong>${escapeHtml(topic.name)}</strong>
		<span class="wm-badge medium">${topic.type.toUpperCase()}</span>
	</div>
	<div class="wm-mini">Factors: ${topic.factors.length} | Kind: ${topic.kind}</div>
	<div class="wm-mini" style="margin-top:4px; font-style: italic;">${escapeHtml(topic.description || '')}</div>
</div>
`;

const renderPipelineCard = (pipeline: Pipeline) => `
<div class="wm-list-item">
	<div style="display:flex; justify-content: space-between; align-items: center;">
		<strong>${escapeHtml(pipeline.name)}</strong>
		<span class="wm-badge ${pipeline.enabled ? 'low' : 'high'}">${pipeline.enabled ? 'ENABLED' : 'DISABLED'}</span>
	</div>
	<div class="wm-mini">Trigger: ${pipeline.type} | Validated: ${pipeline.validated ? '✅' : '❌'}</div>
</div>
`;

export const renderMainContent = (store: Store) => {
	const {state} = store;
	const currentModuleTasks = state.activeWorkflow.filter(t => t.module === state.main);

	if (state.main === 'ingest') {
		return `
<div class="wm-card">
	<h3 class="wm-title">1. Ingest (数据采集)</h3>
	<div class="wm-list-item">管理外部数据源连接。</div>
	<div style="height:10px"></div>
	<h4 class="wm-title" style="font-size:14px">Data Sources</h4>
	<div class="wm-list">
		${state.dataSources.map(renderDataSourceCard).join('')}
	</div>
	<div style="height:20px"></div>
	<h4 class="wm-title" style="font-size:14px">Workflow Status</h4>
	<div class="wm-list">
		${currentModuleTasks.length ? currentModuleTasks.map(renderWorkflowCard).join('') : '<div class="wm-mini">No active tasks.</div>'}
	</div>
</div>`;
	}

	if (state.main === 'model') {
		return `
<div class="wm-card">
	<h3 class="wm-title">3. Model (数据建模)</h3>
	<div class="wm-list-item">定义 Watchmen Topic 逻辑模型。</div>
	<div style="height:10px"></div>
	<h4 class="wm-title" style="font-size:14px">Topics</h4>
	<div class="wm-list">
		${state.topics.map(renderTopicCard).join('')}
	</div>
	<div style="height:20px"></div>
	<h4 class="wm-title" style="font-size:14px">Workflow Status</h4>
	<div class="wm-list">
		${currentModuleTasks.length ? currentModuleTasks.map(renderWorkflowCard).join('') : '<div class="wm-mini">No active tasks.</div>'}
	</div>
</div>`;
	}

	if (state.main === 'transform') {
		return `
<div class="wm-card">
	<h3 class="wm-title">2. Transform (数据转换)</h3>
	<div class="wm-list-item">配置数据流转与转换 Pipeline。</div>
	<div style="height:10px"></div>
	<h4 class="wm-title" style="font-size:14px">Pipelines</h4>
	<div class="wm-list">
		${state.pipelines.map(renderPipelineCard).join('')}
	</div>
	<div style="height:20px"></div>
	<h4 class="wm-title" style="font-size:14px">Workflow Status</h4>
	<div class="wm-list">
		${currentModuleTasks.length ? currentModuleTasks.map(renderWorkflowCard).join('') : '<div class="wm-mini">No active tasks.</div>'}
	</div>
</div>`;
	}

	if (state.main === 'govern') {
		return `
<div class="wm-card">
	<h3 class="wm-title">4. Govern (数据治理)</h3>
	<div class="wm-list-item">数据质量规则、脱敏与安全策略。</div>
	<div style="height:10px"></div>
	<div class="wm-list">
		<div class="wm-list-item">
			<strong>Standard Rules</strong>
			<div class="wm-mini">Order Amount > 0 | Valid Customer ID</div>
		</div>
	</div>
	<div style="height:20px"></div>
	<h4 class="wm-title" style="font-size:14px">Workflow Status</h4>
	<div class="wm-list">
		${currentModuleTasks.length ? currentModuleTasks.map(renderWorkflowCard).join('') : '<div class="wm-mini">No active tasks.</div>'}
	</div>
</div>`;
	}

	if (state.main === 'perceive') {
		return `
<div class="wm-card">
	<h3 class="wm-title">5. Perceive (感知监控)</h3>
	<div class="wm-list-item">实时感知数据漂移与业务异常。</div>
	<div style="height:10px"></div>
	<div class="wm-grid-3">
		<div class="wm-kpi"><div class="wm-kpi-label">Structural Drift</div><div class="wm-kpi-value">0</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">Statistical Drift</div><div class="wm-kpi-value">1</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">Semantic Issues</div><div class="wm-kpi-value">0</div></div>
	</div>
</div>`;
	}

	if (state.main === 'feedback') {
		return `
<div class="wm-card">
	<h3 class="wm-title">6. Feedback (决策反馈)</h3>
	<div class="wm-list-item">人机协同决策与自动反馈动作。</div>
</div>`;
	}

	return `
<div class="wm-card">
	<h3 class="wm-title">${store.data.mainNav.find(item => item.key === state.main)?.label}</h3>
	<div class="wm-list-item">系统基础设定。</div>
</div>`;
};
