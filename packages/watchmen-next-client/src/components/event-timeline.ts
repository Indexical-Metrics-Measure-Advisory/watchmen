import {Store} from '../state/store';
import {EventFilter} from '../types';

const severityIcon = (s: string) => {
	switch (s) {
		case 'critical': return '🔴';
		case 'warning': return '🟠';
		default: return '🔵';
	}
};

const statusLabel = (s: string) => {
	switch (s) {
		case 'pending': return '<span class="wm-status-badge pending">待确认</span>';
		case 'approved': return '<span class="wm-status-badge approved">已确认</span>';
		case 'rejected': return '<span class="wm-status-badge rejected">已拒绝</span>';
		default: return '';
	}
};

export const renderEventTimeline = (store: Store): string => {
	const {perceiveScenarios, selectedScenarioId, eventFilter} = store.state;

	let filtered = [...perceiveScenarios];
	if (eventFilter === 'pending') filtered = filtered.filter(s => s.status === 'pending');
	if (eventFilter === 'processed') filtered = filtered.filter(s => s.status !== 'pending');

	// Sort by detectedAt desc
	filtered.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

	const filterHtml = (key: EventFilter, label: string) =>
		`<button class="wm-filter-tab${eventFilter === key ? ' active' : ''}" data-filter="${key}">${label}</button>`;

	const pendingCount = perceiveScenarios.filter(s => s.status === 'pending').length;

	return `
		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">
					感知事件
					${pendingCount > 0 ? `<span style="margin-left:8px;font-size:12px;font-weight:600;color:var(--orange-600)">${pendingCount} 待处理</span>` : ''}
				</div>
				<div class="wm-filter-tabs">
					${filterHtml('all', '全部')}
					${filterHtml('pending', '待确认')}
					${filterHtml('processed', '已处理')}
				</div>
			</div>
			<div class="wm-event-list">
				${filtered.length === 0 ? `
					<div class="wm-empty-state" style="padding:40px 24px">
						<div class="wm-empty-icon">📭</div>
						<div class="wm-empty-text">暂无${eventFilter === 'pending' ? '待确认' : eventFilter === 'processed' ? '已处理' : ''}事件</div>
					</div>
				` : filtered.map(s => `
					<div class="wm-event-item${s.status === 'pending' ? ' pending-item' : ''}${selectedScenarioId === s.id ? ' selected' : ''}" data-scenario-id="${s.id}">
						<div class="wm-severity-dot ${s.severity}"></div>
						<div class="wm-event-info">
							<div class="wm-event-title">${s.title}</div>
							<div class="wm-event-meta">
								<span class="wm-event-topic">${s.topicName}</span>
								<span>${s.detectedAt}</span>
							</div>
						</div>
						${statusLabel(s.status)}
						<span class="wm-confidence">AI ${s.confidence}%</span>
					</div>
				`).join('')}
			</div>
		</div>
	`;
};
