import {AppState} from '../types';

export const renderPerceptionOverview = () => `
<div class="wm-card">
	<h3 class="wm-title">Perception Overview</h3>
	<div class="wm-grid-3">
		<div class="wm-kpi"><div class="wm-kpi-label">Global Health Score</div><div class="wm-kpi-value">92 / 100</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">Structural Drift</div><div class="wm-kpi-value">3</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">Statistical Drift</div><div class="wm-kpi-value">7</div></div>
	</div>
	<div style="height:10px"></div>
	<div class="wm-grid-2">
		<div class="wm-list-item"><strong>Top Anomaly</strong><div class="wm-mini">premium 字段分布异常 ↑300%</div></div>
		<div class="wm-list-item"><strong>Top Anomaly</strong><div class="wm-mini">policy schema changed</div></div>
		<div class="wm-list-item"><strong>Top Anomaly</strong><div class="wm-mini">ingestion drop -40%</div></div>
		<div class="wm-list-item"><strong>Semantic Drift</strong><div class="wm-mini">premium 年缴 → 月缴疑似变化</div></div>
	</div>
	<div style="height:10px"></div>
	<div class="wm-timeline">
		<div>09:10 Structural signal detected at topic <strong>policy_raw</strong></div>
		<div>09:22 Statistical drift score reached <strong>0.87</strong></div>
		<div>09:37 Behavior anomaly: ingestion rate dropped 40%</div>
		<div>09:40 Semantic AI insight generated</div>
	</div>
</div>
`;

export const renderPerceptionLayer = (state: AppState) => {
	if (state.perception === 'structural') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Schema Explorer · Structural Layer</h3>
	<div class="wm-list-item">Topic: <strong>policy_raw</strong></div>
	<div class="wm-list-item">Schema Versions: v1 → v2 → <strong>v3 (current)</strong></div>
	<div class="wm-list">
		<div class="wm-list-item">+ currency (string)</div>
		<div class="wm-list-item">~ premium: number → string</div>
		<div class="wm-list-item">- discount</div>
	</div>
	<div class="wm-btn-group">
		<button class="wm-btn" data-action="accept" data-change="c1">Accept Schema</button>
		<button class="wm-btn reject" data-action="reject" data-change="c1">Mark as Incident</button>
		<button class="wm-btn investigate" data-action="investigate" data-change="c1">Generate Mapping</button>
	</div>
</div>`;
	}
	if (state.perception === 'statistical') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Field Metrics · Statistical Layer</h3>
	<div class="wm-list-item"><strong>Field</strong>: premium</div>
	<div class="wm-grid-3">
		<div class="wm-kpi"><div class="wm-kpi-label">avg</div><div class="wm-kpi-value">1000 → 12000 ⚠️</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">p95</div><div class="wm-kpi-value">2000 → 30000 ⚠️</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">null ratio</div><div class="wm-kpi-value">1% → 15% ⚠️</div></div>
	</div>
	<div style="height:10px"></div>
	<div class="wm-list-item"><strong>Drift Score</strong>: 0.87 (High)</div>
	<div class="wm-btn-group">
		<button class="wm-btn" data-action="accept" data-change="c2">正常业务变化</button>
		<button class="wm-btn reject" data-action="reject" data-change="c2">数据异常</button>
		<button class="wm-btn investigate" data-action="investigate" data-change="c2">Create Rule</button>
	</div>
</div>`;
	}
	if (state.perception === 'behavior') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Pipeline Health · Behavior Layer</h3>
	<div class="wm-list-item">Topic: <strong>policy_raw</strong></div>
	<div class="wm-grid-3">
		<div class="wm-kpi"><div class="wm-kpi-label">Ingestion Rate</div><div class="wm-kpi-value">10k/min → 2k/min ⚠️</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">Latency</div><div class="wm-kpi-value">2s → 15s ⚠️</div></div>
		<div class="wm-kpi"><div class="wm-kpi-label">Partition</div><div class="wm-kpi-value">skew detected</div></div>
	</div>
	<div style="height:10px"></div>
	<div class="wm-list-item">系统是否“活着”：当前需要触发自动 backfill + pipeline protect</div>
</div>`;
	}
	if (state.perception === 'semantic') {
		return `
<div class="wm-card">
	<h3 class="wm-title">Semantic Monitor · Semantic Layer</h3>
	<div class="wm-list-item">Entity: <strong>Policy</strong></div>
	<div class="wm-list-item">✔ must_have: customer_id</div>
	<div class="wm-list-item">❌ premium > 0 (violated 12%)</div>
	<div class="wm-list-item wm-impact">⚠️ premium 语义疑似变化（年缴 → 月缴）</div>
	<div class="wm-list-item"><strong>AI Insight</strong>: "premium 平均下降 90%，可能由 annual → monthly 转换导致"</div>
	<div class="wm-btn-group">
		<button class="wm-btn" data-action="accept" data-change="c4">接受语义变化</button>
		<button class="wm-btn reject" data-action="reject" data-change="c4">更新语义定义</button>
		<button class="wm-btn investigate" data-action="investigate" data-change="c4">下游影响分析</button>
	</div>
</div>`;
	}
	return renderPerceptionOverview();
};
