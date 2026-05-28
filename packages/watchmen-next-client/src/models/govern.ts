import { Severity } from "./common";

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