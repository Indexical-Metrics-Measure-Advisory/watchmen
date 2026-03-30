import {Store} from '../state/store';
import {escapeHtml} from '../utils/format';

export const renderChatPanel = (store: Store) => {
	const messagesHtml = store.state.chatHistory.map(msg => `
		<div class="wm-chat-msg ${msg.role}">
			<div class="wm-chat-bubble">${escapeHtml(msg.content)}</div>
			${msg.suggestedActions && msg.suggestedActions.length > 0 ? `
				<div class="wm-chat-actions">
					${msg.suggestedActions.map(action => `
						<button class="wm-chat-action-btn" data-chat-action="${action.action}">${escapeHtml(action.label)}</button>
					`).join('')}
				</div>
			` : ''}
		</div>
	`).join('');

	return `
		<div class="wm-chat-container">
			<div class="wm-chat-messages" id="chat-messages">
				${messagesHtml}
			</div>
			<div class="wm-chat-input-area">
				<input type="text" id="chat-input" class="wm-chat-input" placeholder="输入你想做的数据任务..." autocomplete="off">
				<button id="chat-send" class="wm-chat-send">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
				</button>
			</div>
		</div>
	`;
};