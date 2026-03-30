import {createInitialState} from '../data';
import {ActionItem, AppState, DecisionType, Incident, MainNavKey, NavItem, PendingChange, PerceptionView} from '../types';

export type RuntimeData = {
	mainNav: Array<NavItem>;
	pendingChanges: Array<PendingChange>;
	incidents: Array<Incident>;
	actions: Array<ActionItem>;
};

export type Store = {
	state: AppState;
	data: RuntimeData;
	setMainNav: (main: MainNavKey) => void;
	setPerceptionView: (view: PerceptionView) => void;
	addDecision: (changeId: string, decision: DecisionType) => void;
};

export const createStore = (data: RuntimeData): Store => {
	const state = createInitialState();
	return {
		state,
		data,
		setMainNav: (main: MainNavKey) => {
			state.main = main;
		},
		setPerceptionView: (view: PerceptionView) => {
			state.main = 'perception';
			state.perception = view;
		},
		addDecision: (changeId: string, decision: DecisionType) => {
			state.decisions.push({
				changeId,
				decision,
				at: new Date().toLocaleString()
			});
		}
	};
};
