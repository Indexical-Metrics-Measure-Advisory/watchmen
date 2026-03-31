import {Store} from '../state/store';
import {AgentLogAction} from '../types';

const actionDotClass = (action: AgentLogAction) => {
	switch (action) {
		case 'detected': return 'detected';
		case 'analyzed': return 'analyzed';
		case 'suggested': return 'suggested';
		case 'user_action': return 'user_action';
		default: return 'info';
	}
};

const actionLabel = (action: AgentLogAction) => {
	switch (action) {
		case 'detected': return '检测';
		case 'analyzed': return '分析';
		case 'suggested': return '建议';
		case 'user_action': return '操作';
		default: return '信息';
	}
};

export const renderAgentPanel = (store: Store): string => {
	const {agentLogs, chatHistory} = store.state;

	// Combine agent logs + recent chat messages for display
	const logsHtml = [...agentLogs]
		.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
		.map(log => `
			<div class="wm-agent-msg">
				<div class="wm-agent-msg-dot ${actionDotClass(log.action)}"></div>
				<div class="wm-agent-msg-content">
					<div class="wm-agent-msg-text">
						<span style="font-weight:600;font-size:11px;color:var(--text-tertiary);text-transform:uppercase;margin-right:6px">${actionLabel(log.action)}</span>
						${log.content}
					</div>
					<div class="wm-agent-msg-time">${log.timestamp}</div>
				</div>
			</div>
		`).join('');

	// Chat messages from suggested actions
	const chatSuggestions = chatHistory
		.filter(m => m.role === 'assistant' && m.suggestedActions && m.suggestedActions.length > 0)
		.slice(-1);

	const suggestionsHtml = chatSuggestions.length > 0 ? `
		<div style="display:flex;gap:8px;padding:0 24px 12px;flex-wrap:wrap">
			${chatSuggestions[0].suggestedActions!.map(a => `
				<button class="wm-btn wm-btn-primary" style="font-size:12px;padding:6px 14px" data-chat-action="${a.action}">${a.label}</button>
			`).join('')}
		</div>
	` : '';

	return `
		<div class="wm-agent-panel">
			<div class="wm-agent-header">
				<div class="wm-agent-header-left">
					<div class="wm-agent-avatar">🤖</div>
					<span class="wm-section-title" style="font-size:14px">Agent 活动日志</span>
					<span style="font-size:12px;color:var(--text-tertiary)">${agentLogs.length} 条记录</span>
				</div>
				<span class="wm-agent-toggle">▾</span>
			</div>
			<div class="wm-agent-body">
				<div class="wm-agent-messages">
					${logsHtml}
				</div>
				${suggestionsHtml}
				<div class="wm-agent-input-area">
					<input type="text" class="wm-agent-input" placeholder="向 Agent 提问..." autocomplete="off">
					<button class="wm-agent-send">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
					</button>
				</div>
			</div>
		</div>
	`;
};
