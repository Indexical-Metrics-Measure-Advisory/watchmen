import {createInitialState} from '../data';
import {AppState, ChatMessage, MainNavKey, PerceiveChangeStatus, AgentLog, EventFilter} from '../types';

export type RuntimeData = {
	mainNav: Array<{key: MainNavKey; label: string; icon: string}>;
};

export type Store = {
	state: AppState;
	data: RuntimeData;
	setMainNav: (main: MainNavKey) => void;
	addChatMessage: (msg: ChatMessage) => void;
	selectScenario: (id: string | null) => void;
	setPerceiveScenarioStatus: (scenarioId: string, status: PerceiveChangeStatus) => void;
	setEventFilter: (filter: EventFilter) => void;
	addAgentLog: (log: AgentLog) => void;
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
		},
		selectScenario: (id: string | null) => {
			state.selectedScenarioId = id;
		},
		setPerceiveScenarioStatus: (scenarioId: string, status: PerceiveChangeStatus) => {
			const scenario = state.perceiveScenarios.find(s => s.id === scenarioId);
			if (scenario) {
				scenario.status = status;
			}
		},
		setEventFilter: (filter: EventFilter) => {
			state.eventFilter = filter;
		},
		addAgentLog: (log: AgentLog) => {
			state.agentLogs.push(log);
		}
	};
};
