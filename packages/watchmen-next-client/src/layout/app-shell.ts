import {renderReviewQueue} from '../components/review-queue';
import {renderMainContent} from '../routes/main-content';
import {Store} from '../state/store';
import {DecisionType, MainNavKey, PerceptionView} from '../types';
import {style} from '../styles';

export const renderAppShell = (container: HTMLElement, store: Store) => {
	container.innerHTML = `
<style>${style}</style>
<div class="wm-shell">
	<aside class="wm-nav">
		<div class="wm-logo">Watchmen UI</div>
		<div class="wm-subtitle">Control Plane + Perception Console</div>
		<div class="wm-menu">
			${store.data.mainNav.map(item => `<div class="wm-menu-item ${item.key === store.state.main ? 'active' : ''}" data-nav="${item.key}">${item.label}</div>`).join('')}
		</div>
	</aside>
	<main class="wm-main">
		<section class="wm-content">${renderMainContent(store)}</section>
		<aside class="wm-side">${renderReviewQueue(store.state, store.data.pendingChanges)}</aside>
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
	container.querySelectorAll<HTMLElement>('[data-perception]').forEach(node => {
		node.onclick = () => {
			store.setPerceptionView(node.dataset.perception as PerceptionView);
			rerender();
		};
	});
	container.querySelectorAll<HTMLButtonElement>('[data-action][data-change]').forEach(node => {
		node.onclick = () => {
			store.addDecision(node.dataset.change as string, node.dataset.action as DecisionType);
			rerender();
		};
	});
};
