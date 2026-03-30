import {createInitialState} from '../data';
import {AppState, ChatMessage, MainNavKey} from '../types';

export type RuntimeData = {
	mainNav: Array<{key: MainNavKey; label: string}>;
};

export type Store = {
	state: AppState;
	data: RuntimeData;
	setMainNav: (main: MainNavKey) => void;
	addChatMessage: (msg: ChatMessage) => void;
};

export const createStore = (initialData: RuntimeData): Store => {
	const state = createInitialState();
	return {
		state,
		data: initialData,
		setMainNav: (main: MainNavKey) => {
			state.main = main;
		},
		addChatMessage: (msg: ChatMessage) => {
			state.chatHistory.push(msg);
		}
	};
};
