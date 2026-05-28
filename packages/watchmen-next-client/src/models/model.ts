import { HealthStatus } from "./common";

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