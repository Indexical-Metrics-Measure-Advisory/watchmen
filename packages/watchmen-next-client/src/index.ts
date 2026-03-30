import {renderAppShell, bindAppEvents} from './layout/app-shell';
import {fetchActions, fetchIncidents, fetchMainNav, fetchPendingChanges} from './mock-api/watchmen-api';
import {createStore} from './state/store';

const mount = async (container: HTMLElement) => {
	const [mainNav, pendingChanges, incidents, actions] = await Promise.all([
		fetchMainNav(),
		fetchPendingChanges(),
		fetchIncidents(),
		fetchActions()
	]);
	const store = createStore({mainNav, pendingChanges, incidents, actions});
	const rerender = () => {
		renderAppShell(container, store);
		bindAppEvents(container, rerender, store);
	};
	rerender();
};

export const mountWatchmenUI = (container: HTMLElement) => {
	void mount(container);
};

declare global {
	interface Window {
		mountWatchmenUI?: (container: HTMLElement) => void;
	}
}

if (typeof window !== 'undefined') {
	window.mountWatchmenUI = mountWatchmenUI;
	if (typeof document !== 'undefined') {
		const root = document.getElementById('app') ?? document.body;
		mountWatchmenUI(root);
	}
}
