import { HealthStatus, Severity } from "./common";

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

export type ObservabilityView = "overview" | "catalog" | "graph" | "impact" | "events";

export type ObservabilityDirection = "upstream" | "downstream" | "both";

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