export type MainNavKey = "observe" | "perceive" | "ingest" | "transform" | "model" | "govern" | "feedback" | "settings";

export type ChatMessage = {
	id: string;
	role: "system" | "user" | "assistant";
	content: string;
	suggestedActions?: Array<{ label: string; action: string; payload?: any }>;
};

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export type WorkflowTask = {
	id: string;
	module: MainNavKey;
	title: string;
	description: string;
	status: TaskStatus;
	requiresUserConfirmation?: boolean;
};

// --- Watchmen Business Models ---

export type DataSourceType =
	| "mysql"
	| "oracle"
	| "mongodb"
	| "mssql"
	| "postgresql"
	| "snowflake"
	| "oss"
	| "s3"
	| "adls";

export type DataSource = {
	dataSourceId: string;
	dataSourceCode: string;
	dataSourceType: DataSourceType;
	host?: string;
	port?: string;
	username?: string;
	name: string;
	url?: string;
	healthStatus: HealthStatus;
	lastSync?: string;
	recordCount?: number;
	domain?: string;
};

export type TopicKind = "system" | "business" | "synonym";
export type TopicType = "raw" | "meta" | "distinct" | "aggregate" | "time" | "ratio";

export type Factor = {
	factorId: string;
	name: string;
	label?: string;
	type: string;
};

export type Topic = {
	topicId: string;
	name: string;
	type: TopicType;
	kind: TopicKind;
	dataSourceId?: string;
	factors: Factor[];
	description?: string;
	domain?: string;
	recordCount?: number;
	healthStatus?: HealthStatus;
};

export type PipelineTriggerType = "insert" | "merge" | "insert-or-merge" | "delete";

export type Pipeline = {
	pipelineId: string;
	topicId: string;
	name: string;
	type: PipelineTriggerType;
	enabled: boolean;
	validated: boolean;
	healthStatus?: HealthStatus;
	lastRun?: string;
};

// --- Perceive / Agent Models ---

export type Severity = "critical" | "warning" | "info";
export type HealthStatus = "healthy" | "warning" | "error" | "unknown";

export type DriftMetric = {
	label: string;
	baseline: number;
	current: number;
	unit?: string;
};

export type PerceiveChangeStatus = "pending" | "approved" | "rejected";

export type PerceiveChangeItem = {
	field: string;
	baseline: string;
	current: string;
	impact: "low" | "medium" | "high";
};

export type PerceiveScenario = {
	id: string;
	title: string;
	description: string;
	topicName: string;
	detectedAt: string;
	status: PerceiveChangeStatus;
	severity: Severity;
	confidence: number; // AI confidence 0-100
	driftMetrics: DriftMetric[];
	proposedChanges: PerceiveChangeItem[];
};

export type AgentLogAction = "detected" | "analyzed" | "suggested" | "user_action" | "info";

export type AgentLog = {
	id: string;
	timestamp: string;
	action: AgentLogAction;
	scenarioId?: string;
	content: string;
};

export type EventFilter = "all" | "pending" | "processed";

export type ObservabilityView = "overview" | "catalog" | "graph" | "impact" | "events";
export type ObservabilityDirection = "upstream" | "downstream" | "both";
export type ObservabilityNodeStage = "ingest" | "raw" | "pipeline" | "topic" | "semantic" | "metric" | "consumption";
export type ObservabilityNodeType =
	| "source_system"
	| "source_table"
	| "source_field"
	| "raw_topic"
	| "raw_factor"
	| "pipeline"
	| "topic"
	| "factor"
	| "semantic_model"
	| "semantic_measure"
	| "metric"
	| "metric_ref"
	| "chart"
	| "alert"
	| "subscription";

export type ObservabilityNode = {
	id: string;
	stage: ObservabilityNodeStage;
	type: ObservabilityNodeType;
	name: string;
	label?: string;
	description?: string;
	healthStatus: HealthStatus;
	badges?: string[];
	metadata?: Record<string, any>;
};

export type ObservabilityEdge = {
	id: string;
	from: string;
	to: string;
	relation: string;
	isInferred?: boolean;
};

export type ObservabilityEvent = {
	id: string;
	timestamp: string;
	severity: Severity;
	eventType: string;
	targetId: string;
	targetLabel: string;
	message: string;
	impactedMetrics: string[];
	healthStatus: HealthStatus;
};

export type ObservabilityImpactItem = {
	id: string;
	type: "topic" | "semantic" | "metric" | "consumption";
	name: string;
	severity: Severity;
	healthStatus: HealthStatus;
	shortestPath: string[];
};

export type ObservabilityKpi = {
	label: string;
	value: string;
	sub: string;
	tone: "green" | "orange" | "blue" | "gray";
};

export type ObservabilityStageHealth = {
	stage: ObservabilityNodeStage;
	healthy: number;
	warning: number;
	error: number;
};

export type ObservabilityCatalogFilter = {
	search: string;
	stage: string;
	health: string;
	domain: string;
	sort: "name" | "count" | "health";
	page: number;
	pageSize: number;
};

export type ObservabilityGraphZoom = "stage" | "domain" | "node";

export type ObservabilityEventFilter = {
	severity: string;
	eventType: string;
	page: number;
	pageSize: number;
};

// --- Govern Models ---

export type RuleCategory = "freshness" | "completeness" | "validity" | "uniqueness" | "consistency";

export type GovernRule = {
	ruleId: string;
	name: string;
	description: string;
	category: RuleCategory;
	severity: Severity;
	targetTopic?: string;
	targetFactor?: string;
	enabled: boolean;
	lastChecked?: string;
	passRate?: number;
};

export type MaskingPolicy = {
	policyId: string;
	name: string;
	targetTopic: string;
	targetFactor: string;
	strategy: "sha256" | "partial_mask" | "redact" | "tokenize";
	enabled: boolean;
	appliesTo: string[];
};

// --- App State ---
export type AppState = {
	main: MainNavKey;
	chatHistory: Array<ChatMessage>;
	activeWorkflow: Array<WorkflowTask>;
	isChatting: boolean;
	// Business Data
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
