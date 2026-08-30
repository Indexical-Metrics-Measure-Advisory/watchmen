import { createInitialState, MainNavGroup, MainNavItem } from "../data";
import {
	AppState,
	ChatMessage,
	MainNavKey,
	PerceiveChangeStatus,
	AgentLog,
	EventFilter,
	OntologyObject,
	OntologyView,
	ObservabilityDirection,
	ObservabilityView,
	ObservabilityCatalogFilter,
	ObservabilityGraphZoom,
	ObservabilityEventFilter,
} from "../models";

export type RuntimeData = {
	mainNavGroups: MainNavGroup[];
	mainNav: MainNavItem[];
};

export type Store = {
	state: AppState;
	data: RuntimeData;
	setMainNav: (main: MainNavKey) => void;
	addChatMessage: (msg: ChatMessage) => void;
	selectScenario: (id: string | null) => void;
	setPerceiveScenarioStatus: (scenarioId: string, status: PerceiveChangeStatus) => void;
	applyApprovedEffects: (scenarioId: string) => void;
	setEventFilter: (filter: EventFilter) => void;
	addAgentLog: (log: AgentLog) => void;
	setOntologyView: (view: OntologyView) => void;
	selectOntologyObject: (objectId: string | null) => void;
	setOntologyCatalogFilter: (patch: Partial<AppState["ontologyCatalogFilter"]>) => void;
	openOntologyObject: (objectId: string) => void;
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
		// Closes the perceive -> governance/ontology loop: applies the effects of
		// every proposed change of an approved scenario to the in-memory state and
		// records each applied effect in the agent log.
		applyApprovedEffects: (scenarioId: string) => {
			const scenario = state.perceiveScenarios.find((s) => s.id === scenarioId);
			if (!scenario) return;
			const timestamp = new Date().toLocaleString("en-US", { hour12: false });
			const logEffect = (content: string, index: number) => {
				state.agentLogs.push({
					id: `log-${Date.now()}-${index}`,
					timestamp,
					action: "user_action",
					scenarioId,
					content,
				});
			};
			scenario.proposedChanges.forEach((change, index) => {
				const effect = change.effect;
				if (!effect) return;
				switch (effect.kind) {
					case "update_rule_params": {
						const rule = state.governRules.find((r) => r.ruleId === effect.ruleId);
						if (rule) {
							rule.params = { ...(rule.params || {}), ...effect.params };
							rule.updatedBy = scenarioId;
							rule.lastChecked = timestamp;
						}
						logEffect(
							`Applied effect: rule ${effect.ruleId} params updated (${Object.entries(effect.params)
								.map(([k, v]) => `${k}=${v}`)
								.join(", ")})`,
							index,
						);
						break;
					}
					case "add_attribute": {
						const object = state.ontologyObjects.find((o) => o.id === effect.objectId);
						if (object && !object.attributes.some((a) => a.name === effect.attribute.name)) {
							object.attributes.push({ ...effect.attribute });
						}
						logEffect(
							`Applied effect: attribute ${effect.attribute.name} added to object ${effect.objectId}`,
							index,
						);
						break;
					}
					case "add_masking_policy": {
						if (!state.maskingPolicies.some((p) => p.policyId === effect.policy.policyId)) {
							state.maskingPolicies.push({ ...effect.policy });
						}
						logEffect(
							`Applied effect: masking policy ${effect.policy.policyId} (${effect.policy.strategy}) created and enabled`,
							index,
						);
						break;
					}
					case "update_glossary_term": {
						const term = state.glossaryTerms.find((t) => t.id === effect.termId);
						if (term) {
							if (effect.definition) term.definition = effect.definition;
							if (effect.status) term.status = effect.status;
						}
						logEffect(
							`Applied effect: glossary term ${effect.termId} updated${effect.status ? ` (status: ${effect.status})` : ""}`,
							index,
						);
						break;
					}
					case "add_glossary_term": {
						if (!state.glossaryTerms.some((t) => t.id === effect.term.id)) {
							state.glossaryTerms.push({ ...effect.term });
						}
						logEffect(`Applied effect: glossary term ${effect.term.id} created`, index);
						break;
					}
				}
			});
		},
		setEventFilter: (filter: EventFilter) => {
			state.eventFilter = filter;
		},
		addAgentLog: (log: AgentLog) => {
			state.agentLogs.push(log);
		},
		setOntologyView: (view: OntologyView) => {
			state.ontologyView = view;
			state.ontologySelectedObjectId = null;
		},
		selectOntologyObject: (objectId: string | null) => {
			state.ontologySelectedObjectId = objectId;
		},
		setOntologyCatalogFilter: (patch: Partial<AppState["ontologyCatalogFilter"]>) => {
			Object.assign(state.ontologyCatalogFilter, patch);
		},
		openOntologyObject: (objectId: string) => {
			const object: OntologyObject | undefined = state.ontologyObjects.find((o) => o.id === objectId);
			if (!object) return;
			state.main = "ontology";
			state.ontologySelectedObjectId = objectId;
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
