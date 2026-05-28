import { MainNavKey } from "./nav";
import { ChatMessage, AgentLog } from "./agent";
import { DataSource } from "./ingest";
import { Topic } from "./model";
import { Pipeline } from "./transform";
import { GovernRule, MaskingPolicy } from "./govern";
import { PerceiveScenario } from "./perceive";
import {
	ObservabilityNode,
	ObservabilityEdge,
	ObservabilityEvent,
	ObservabilityImpactItem,
	ObservabilityKpi,
	ObservabilityStageHealth,
	ObservabilityView,
	ObservabilityDirection,
	ObservabilityCatalogFilter,
	ObservabilityGraphZoom,
	ObservabilityEventFilter,
} from "./observability";

export type EventFilter = "all" | "pending" | "processed";

export type AppState = {
	main: MainNavKey;
	chatHistory: Array<ChatMessage>;
	activeWorkflow: Array<import("./workflow").WorkflowTask>;
	isChatting: boolean;
	dataSources: DataSource[];
	topics: Topic[];
	pipelines: Pipeline[];
	perceiveScenarios: PerceiveScenario[];
	selectedScenarioId: string | null;
	agentLogs: AgentLog[];
	eventFilter: EventFilter;
	observabilityView: ObservabilityView;
	observabilityDirection: ObservabilityDirection;
	observabilityFocusNodeId: string;
	observabilitySelectedNodeId: string;
	observabilityNodes: ObservabilityNode[];
	observabilityEdges: ObservabilityEdge[];
	observabilityEvents: ObservabilityEvent[];
	observabilityImpact: ObservabilityImpactItem[];
	observabilityKpis: ObservabilityKpi[];
	observabilityStageHealth: ObservabilityStageHealth[];
	observabilityCatalogFilter: ObservabilityCatalogFilter;
	observabilityGraphZoom: ObservabilityGraphZoom;
	observabilityGraphDomain: string;
	observabilityEventFilter: ObservabilityEventFilter;
	observabilityGlobalSearch: string;
	governRules: GovernRule[];
	maskingPolicies: MaskingPolicy[];
};