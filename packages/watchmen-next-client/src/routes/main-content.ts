import {Store} from '../state/store';
import {renderKpiBar} from '../components/kpi-bar';
import {renderEventTimeline} from '../components/event-timeline';
import {renderChangeDetail} from '../components/change-detail';

const renderSimpleModule = (title: string, description: string, content: string) => `
	<div class="wm-section-card">
		<div class="wm-section-header">
			<div class="wm-section-title">${title}</div>
		</div>
		<div style="padding:24px">
			<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">${description}</div>
			${content}
		</div>
	</div>
`;

export const renderMainContent = (store: Store) => {
	const {state} = store;

	// Perceive is the primary view — full event-driven dashboard
	if (state.main === 'perceive') {
		return `
			<div class="wm-perceive-page">
				<div class="wm-perceive-top">
					${renderKpiBar(store)}
				</div>
				<div class="wm-perceive-main">
					<div class="wm-perceive-timeline">${renderEventTimeline(store)}</div>
					<div class="wm-perceive-detail">${renderChangeDetail(store)}</div>
				</div>
			</div>
		`;
	}

	// Other modules — simplified placeholder cards
	if (state.main === 'ingest') {
		return renderSimpleModule(
			'数据采集',
			'管理外部数据源连接与同步配置。',
			`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
				${state.dataSources.map(ds => `
					<div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:16px">
						<div style="font-weight:600;font-size:14px;margin-bottom:4px">${ds.name}</div>
						<div style="font-size:12px;color:var(--text-tertiary)">${ds.dataSourceType.toUpperCase()} · ${ds.host || 'N/A'}</div>
					</div>
				`).join('')}
			</div>`
		);
	}

	if (state.main === 'model') {
		return renderSimpleModule(
			'数据建模',
			'定义 Watchmen Topic 逻辑模型与 Factor 结构。',
			`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
				${state.topics.map(topic => `
					<div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:16px">
						<div style="font-weight:600;font-size:14px;margin-bottom:4px">${topic.name}</div>
						<div style="font-size:12px;color:var(--text-tertiary)">${topic.type.toUpperCase()} · ${topic.kind} · ${topic.factors.length} factors</div>
						<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;font-style:italic">${topic.description || ''}</div>
					</div>
				`).join('')}
			</div>`
		);
	}

	if (state.main === 'transform') {
		return renderSimpleModule(
			'数据转换',
			'配置数据流转与转换 Pipeline。',
			`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
				${state.pipelines.map(p => `
					<div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:16px">
						<div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.name}</div>
						<div style="font-size:12px;color:var(--text-tertiary)">${p.type} · ${p.enabled ? '✅ Enabled' : '⏸ Disabled'} · Validated: ${p.validated ? 'Yes' : 'No'}</div>
					</div>
				`).join('')}
			</div>`
		);
	}

	if (state.main === 'govern') {
		return renderSimpleModule(
			'数据治理',
			'数据质量规则、脱敏与安全策略管理。',
			`<div style="font-size:13px;color:var(--text-secondary)">
				<p>当前活跃质量规则：</p>
				<ul style="margin-top:8px;padding-left:20px;list-style:disc">
					<li>Order Amount > 0</li>
					<li>Valid Customer ID (regex: ^CUST-\\d{8}$)</li>
					<li>Duplicate Order Detection</li>
				</ul>
			</div>`
		);
	}

	if (state.main === 'feedback') {
		return renderSimpleModule(
			'决策反馈',
			'人机协同决策记录与自动反馈动作。',
			`<div style="font-size:13px;color:var(--text-secondary)">
				<p>人机协同决策通过感知模块的事件确认机制完成。Agent 检测到变更后，由人工确认或拒绝，系统自动记录决策并反馈至下一次感知周期。</p>
			</div>`
		);
	}

	// Settings fallback
	const label = store.data.mainNav.find(item => item.key === state.main)?.label || state.main;
	return renderSimpleModule(label, '系统配置。', '');
};
