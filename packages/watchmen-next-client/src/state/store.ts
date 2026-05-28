import { createInitialState } from "../data";
import {
	AppState,
	ChatMessage,
	MainNavKey,
	PerceiveChangeStatus,
	AgentLog,
	EventFilter,
	ObservabilityDirection,
	ObservabilityView,
	ObservabilityCatalogFilter,
	ObservabilityGraphZoom,
	ObservabilityEventFilter,
} from "../models";

export type RuntimeData = {
	mainNav: Array<{ key: MainNavKey; label: string; icon: string }>;
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
	setObservabilityView: (view: ObservabilityView) => void;
	setObservabilityDirection: (direction: ObservabilityDirection) => void;
	setObservabilityFocusNode: (nodeId: string) => void;
	setObservabilitySelectedNode: (nodeId: string) => void;
	setObserveCatalogFilter: (patch: Partial<ObservabilityCatalogFilter>) => void;
	setObserveGraphZoom: (zoom: ObservabilityGraphZoom, domain?: string) => void;
	setObserveEventFilter: (patch: Partial<ObservabilityEventFilter>) => void;
	setObserveGlobalSearch: (search: string) => void;
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
			const scenario = state.perceiveScenarios.find((s) => s.id === scenarioId);
			if (scenario) {
				scenario.status = status;
			}
		},
		setEventFilter: (filter: EventFilter) => {
			state.eventFilter = filter;
		},
		addAgentLog: (log: AgentLog) => {
			state.agentLogs.push(log);
		},
		setObservabilityView: (view: ObservabilityView) => {
			state.observabilityView = view;
		},
		setObservabilityDirection: (direction: ObservabilityDirection) => {
			state.observabilityDirection = direction;
		},
		setObservabilityFocusNode: (nodeId: string) => {
			state.observabilityFocusNodeId = nodeId;
			state.observabilitySelectedNodeId = nodeId;
		},
		setObservabilitySelectedNode: (nodeId: string) => {
			state.observabilitySelectedNodeId = nodeId;
		},
		setObserveCatalogFilter: (patch: Partial<ObservabilityCatalogFilter>) => {
			Object.assign(state.observabilityCatalogFilter, patch);
		},
		setObserveGraphZoom: (zoom: ObservabilityGraphZoom, domain?: string) => {
			state.observabilityGraphZoom = zoom;
			state.observabilityGraphDomain = domain || "";
		},
		setObserveEventFilter: (patch: Partial<ObservabilityEventFilter>) => {
			Object.assign(state.observabilityEventFilter, patch);
		},
		setObserveGlobalSearch: (search: string) => {
			state.observabilityGlobalSearch = search;
		},
	};
};
