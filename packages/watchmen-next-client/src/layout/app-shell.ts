import {renderChatPanel} from '../components/chat-panel';
import {renderMainContent} from '../routes/main-content';
import {Store} from '../state/store';
import {MainNavKey} from '../types';
import {style} from '../styles';

export const renderAppShell = (container: HTMLElement, store: Store) => {
	container.innerHTML = `
<style>${style}</style>
<div class="wm-shell">
	<aside class="wm-nav">
		<div class="wm-logo">Watchmen Copilot</div>
		<div class="wm-subtitle">Agent-driven Data Engineering</div>
		<div class="wm-menu">
			${store.data.mainNav.map(item => `<div class="wm-menu-item ${item.key === store.state.main ? 'active' : ''}" data-nav="${item.key}">${item.label}</div>`).join('')}
		</div>
	</aside>
	<main class="wm-main">
		<section class="wm-content">${renderMainContent(store)}</section>
		<aside class="wm-side">${renderChatPanel(store)}</aside>
	</main>
</div>`;
};

export const bindAppEvents = (container: HTMLElement, rerender: () => void, store: Store) => {
	container.querySelectorAll<HTMLElement>('[data-nav]').forEach(node => {
		node.onclick = () => {
			store.setMainNav(node.dataset.nav as MainNavKey);
			rerender();
		};
	});

	// Chat Input Handling
	const chatInput = container.querySelector<HTMLInputElement>('#chat-input');
	const chatSend = container.querySelector<HTMLButtonElement>('#chat-send');

	const handleSend = () => {
		if (chatInput && chatInput.value.trim()) {
			store.addChatMessage({
				id: 'msg-' + Date.now(),
				role: 'user',
				content: chatInput.value.trim()
			});
			// Mock AI response
			setTimeout(() => {
				store.addChatMessage({
					id: 'msg-' + (Date.now() + 1),
					role: 'assistant',
					content: '收到你的请求。我已经准备好了相关配置，请在左侧主视图中确认并执行。',
					suggestedActions: [{label: '确认并执行', action: 'CONFIRM_EXECUTE'}]
				});
				rerender();
			}, 600);
			rerender();
		}
	};

	if (chatSend) {
		chatSend.onclick = handleSend;
	}
	if (chatInput) {
		chatInput.onkeypress = (e) => {
			if (e.key === 'Enter') handleSend();
		};
	}

	// Suggested Actions Handling
	container.querySelectorAll<HTMLButtonElement>('[data-chat-action]').forEach(node => {
		node.onclick = () => {
			const action = node.dataset.chatAction;
			store.addChatMessage({
				id: 'msg-' + Date.now(),
				role: 'user',
				content: `> 执行动作: ${node.textContent}`
			});

			if (action === 'GENERATE_PIPELINE') {
				setTimeout(() => {
					store.addChatMessage({
						id: 'msg-' + (Date.now() + 1),
						role: 'assistant',
						content: '已根据 Topic "sales_order_raw" 生成 Pipeline "sync_sales_order_to_dw"。我已经将其加入工作流，请切换到 Transform 模块查看详情。'
					});
					// Update workflow status
					const task = store.state.activeWorkflow.find(t => t.id === 'wf-3');
					if (task) task.status = 'completed';
					rerender();
				}, 800);
			} else if (action === 'START_INGEST') {
				setTimeout(() => {
					store.addChatMessage({
						id: 'msg-' + (Date.now() + 1),
						role: 'assistant',
						content: '正在启动新的数据采集任务。请提供数据库连接详情（Host, Port, Username）。'
					});
					rerender();
				}, 500);
			} else {
				setTimeout(() => {
					store.addChatMessage({
						id: 'msg-' + (Date.now() + 1),
						role: 'assistant',
						content: `已启动流程: ${action}。请在左侧主面板查看进度。`
					});
					rerender();
				}, 500);
			}
			rerender();
		};
	});
};
