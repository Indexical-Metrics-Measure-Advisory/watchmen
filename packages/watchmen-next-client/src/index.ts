import {createStore} from './state/store';
import {mainNav, mainNavGroups} from './data';
import {bindAppEvents, renderAppShell} from './layout/app-shell';

export const mountWatchmenUI = (container: HTMLElement) => {
	const store = createStore({mainNav, mainNavGroups});

	const render = () => {
		renderAppShell(container, store);
		bindAppEvents(container, render, store);
	};

	render();
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
