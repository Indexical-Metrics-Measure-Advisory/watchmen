import { Severity } from "./common";

export type PerceiveChangeStatus = "pending" | "approved" | "rejected";

export type DriftMetric = {
	label: string;
	baseline: number;
	current: number;
	unit?: string;
};

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
	confidence: number;
	driftMetrics: DriftMetric[];
	proposedChanges: PerceiveChangeItem[];
};