import {renderAgentPanel} from '../components/chat-panel';
import {renderMainContent} from '../routes/main-content';
import {Store} from '../state/store';
import {MainNavKey} from '../types';
import {style} from '../styles';

export const renderAppShell = (container: HTMLElement, store: Store) => {
	const pendingCount = store.state.perceiveScenarios.filter(s => s.status === 'pending').length;

	container.innerHTML = `
<style>${style}</style>
<div class="wm-shell">
	<aside class="wm-sidebar">
		<div class="wm-sidebar-head">
			<div class="wm-sidebar-logo">W</div>
			<div class="wm-sidebar-brand">
				<div class="wm-sidebar-brand-title">Watchmen</div>
				<div class="wm-sidebar-brand-sub">Perceive Studio</div>
			</div>
		</div>
		<nav class="wm-nav-items">
			${store.data.mainNav.map(item => `
				<button class="wm-nav-item${item.key === store.state.main ? ' active' : ''}" data-nav="${item.key}">
					<span class="wm-nav-icon">${item.icon}</span>
					<span class="wm-nav-label">${item.label}</span>
					${item.key === 'perceive' && pendingCount > 0 ? `<span class="wm-nav-badge">${pendingCount}</span>` : ''}
				</button>
			`).join('')}
		</nav>
		<div class="wm-sidebar-foot">Agent-driven Data Engineering</div>
	</aside>
	<main class="wm-main-content">
		<div class="wm-scroll-area">
			${renderMainContent(store)}
			${renderAgentPanel(store)}
		</div>
	</main>
</div>`;
};

export const bindAppEvents = (container: HTMLElement, rerender: () => void, store: Store) => {
	// Nav click
	container.querySelectorAll<HTMLElement>('[data-nav]').forEach(node => {
		node.onclick = () => {
			store.setMainNav(node.dataset.nav as MainNavKey);
			rerender();
		};
	});

	// Event filter tabs
	container.querySelectorAll<HTMLElement>('[data-filter]').forEach(node => {
		node.onclick = () => {
			store.setEventFilter(node.dataset.filter as any);
			rerender();
		};
	});

	// Scenario selection (click on event item)
	container.querySelectorAll<HTMLElement>('[data-scenario-id]').forEach(node => {
		node.onclick = () => {
			store.selectScenario(node.dataset.scenarioId!);
			rerender();
		};
	});

	// Approve / Reject actions
	container.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(node => {
		node.onclick = () => {
			const action = node.dataset.action;
			const scenarioId = node.dataset.id;
			if (!scenarioId) return;

			const nextStatus = action === 'approve' ? 'approved' : 'rejected';
			store.setPerceiveScenarioStatus(scenarioId, nextStatus);

			// Add agent log
			store.addAgentLog({
				id: 'log-' + Date.now(),
				timestamp: new Date().toLocaleString('zh-CN', {hour12: false}),
				action: 'user_action',
				scenarioId,
				content: action === 'approve' ? '用户确认采纳建议变更' : '用户拒绝建议变更，保持当前配置'
			});

			store.addChatMessage({
				id: 'msg-' + Date.now(),
				role: 'assistant',
				content: action === 'approve'
					? '✅ 变更已确认，系统将按照 Agent 建议执行。'
					: '❌ 变更已拒绝，当前配置保持不变。'
			});

			rerender();
		};
	});

	// Agent panel toggle
	const agentHeader = container.querySelector<HTMLElement>('.wm-agent-header');
	if (agentHeader) {
		agentHeader.onclick = () => {
			const body = container.querySelector<HTMLElement>('.wm-agent-body');
			const toggle = container.querySelector<HTMLElement>('.wm-agent-toggle');
			if (body) body.classList.toggle('collapsed');
			if (toggle) toggle.classList.toggle('collapsed');
		};
	}

	// Agent input handling
	const agentInput = container.querySelector<HTMLInputElement>('.wm-agent-input');
	const agentSend = container.querySelector<HTMLButtonElement>('.wm-agent-send');

	const handleAgentSend = () => {
		if (agentInput && agentInput.value.trim()) {
			store.addChatMessage({
				id: 'msg-' + Date.now(),
				role: 'user',
				content: agentInput.value.trim()
			});

			const userMsg = agentInput.value.trim();
			agentInput.value = '';

			// Mock AI response
			setTimeout(() => {
				store.addChatMessage({
					id: 'msg-' + (Date.now() + 1),
					role: 'assistant',
					content: `收到。我会处理你的请求：「${userMsg}」，请在感知事件面板中查看后续更新。`
				});
				rerender();
			}, 600);
			rerender();
		}
	};

	if (agentSend) agentSend.onclick = handleAgentSend;
	if (agentInput) {
		agentInput.onkeypress = (e) => {
			if (e.key === 'Enter') handleAgentSend();
		};
	}

	// Suggested Actions
	container.querySelectorAll<HTMLButtonElement>('[data-chat-action]').forEach(node => {
		node.onclick = () => {
			const action = node.dataset.chatAction;
			store.addChatMessage({
				id: 'msg-' + Date.now(),
				role: 'user',
				content: `> 执行动作: ${node.textContent}`
			});

			if (action === 'VIEW_PENDING') {
				store.setMainNav('perceive');
				store.setEventFilter('pending');
				const firstPending = store.state.perceiveScenarios.find(s => s.status === 'pending');
				if (firstPending) store.selectScenario(firstPending.id);
				setTimeout(() => {
					store.addChatMessage({
						id: 'msg-' + (Date.now() + 1),
						role: 'assistant',
						content: '已切换到待确认事件列表，请在主面板中查看并处理。'
					});
					rerender();
				}, 300);
			} else {
				setTimeout(() => {
					store.addChatMessage({
						id: 'msg-' + (Date.now() + 1),
						role: 'assistant',
						content: `已启动流程: ${action}。请在面板中查看进度。`
					});
					rerender();
				}, 500);
			}
			rerender();
		};
	});
};
