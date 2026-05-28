import { HealthStatus } from "./common";

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