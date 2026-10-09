export type TimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type WriteMode = 'TRUNCATE_INSERT' | 'MERGE';

export type ScheduleFrequency = 'once' | 'day' | 'week' | 'month';

export interface MaterializationSchedule {
	enabled: boolean;
	frequency: ScheduleFrequency;
	// HH:MM, used by day/week/month/once
	time?: string;
	// YYYY-MM-DD, used by once
	date?: string;
	// mon..sun, used by week
	weekday?: string;
	// 1-31, used by month
	dayOfMonth?: number;
}

export type FactorColumnRole = 'time' | 'dimension' | 'metric' | 'meta';

export interface FactorMappingColumn {
	columnName: string;
	factorName: string;
	factorType: 'text' | 'number' | 'datetime' | 'date' | 'boolean';
	role: FactorColumnRole;
	// source expression hint, e.g. metric_time__day / region / metric name
	source?: string;
}

export type MaterializationEngine = 'AUTO' | 'STORAGE' | 'SPARK';

export interface Materialization {
	materializationId: string;
	name?: string;
	metricId: string;
	metricName: string;
	metricLabel?: string;
	targetTopicId?: string;
	targetTopicName?: string;
	// when true and targetTopicId is empty, backend auto-creates a wide topic
	autoCreateTopic: boolean;
	timeGrain: TimeGrain;
	groupBy: string[];
	writeMode: WriteMode;
	engine: MaterializationEngine;
	schedule: MaterializationSchedule;
	factorMapping?: FactorMappingColumn[];
	enabled: boolean;
	description?: string;
	// set by the backend when groupBy/timeGrain changed; the next run rebuilds history
	rebuildPending?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export type MaterializationRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export type RunTriggerType = 'manual' | 'cron' | 'flow';

export interface MaterializationRun {
	runId: string;
	materializationId: string;
	materializationName?: string;
	metricName?: string;
	flowId?: string;
	flowName?: string;
	status: MaterializationRunStatus;
	triggerType: RunTriggerType;
	engine?: MaterializationEngine;
	windowStart?: string;
	windowEnd?: string;
	rowCount?: number;
	durationMs?: number;
	errorMessage?: string;
	sqlPreview?: string;
	startedAt?: string;
	finishedAt?: string;
}

export interface RunFilter {
	keyword?: string;
	status?: MaterializationRunStatus | 'ALL';
	materializationId?: string;
	pageNumber: number;
	pageSize: number;
}

export interface PageResult<T> {
	data: T[];
	itemCount: number;
	pageNumber: number;
	pageSize: number;
	pageCount: number;
}

export type FlowEdgeKind = 'data' | 'manual' | 'metricRef';

export interface MaterializationFlow {
	flowId: string;
	name: string;
	materializationIds: string[];
	schedule: MaterializationSchedule;
	enabled: boolean;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface FlowGraphNode {
	id: string;
	materializationId: string;
	label: string;
	metricName: string;
	targetTopicName?: string;
	status?: MaterializationRunStatus;
}

export interface FlowGraphEdge {
	id: string;
	source: string;
	target: string;
	edgeKind: FlowEdgeKind;
	label?: string;
}

export interface FlowGraph {
	flowId: string;
	flowName: string;
	nodes: FlowGraphNode[];
	edges: FlowGraphEdge[];
}

export interface MockMetricOption {
	id: string;
	name: string;
	label: string;
}

export interface MockDimensionOption {
	id: string;
	name: string;
	qualifiedName?: string;
}
