import { Severity } from "./common";
import { MaskingPolicy } from "./govern";
import { GlossaryTerm, GlossaryTermStatus, OntologyAttribute } from "./ontology";

export type PerceiveChangeStatus = "pending" | "approved" | "rejected";

export type DriftMetric = {
	label: string;
	baseline: number;
	current: number;
	unit?: string;
};

// Where a proposal lands, so the UI can tie every perceived change to
// governance (rules / policies / glossary) and the ontology.
export type ProposalTargetKind =
	| "ontology_attribute"
	| "ontology_object"
	| "quality_rule"
	| "masking_policy"
	| "glossary_term"
	| "platform_config";

// Applied to the in-memory state when the scenario is approved — this is what
// closes the loop perceive -> governance/ontology.
export type PerceiveEffect =
	| { kind: "update_rule_params"; ruleId: string; params: Record<string, string> }
	| { kind: "add_attribute"; objectId: string; attribute: OntologyAttribute }
	| { kind: "add_masking_policy"; policy: MaskingPolicy }
	| { kind: "update_glossary_term"; termId: string; definition?: string; status?: GlossaryTermStatus }
	| { kind: "add_glossary_term"; term: GlossaryTerm };

export type PerceiveChangeItem = {
	field: string;
	baseline: string;
	current: string;
	impact: "low" | "medium" | "high";
	// Proposal target (optional for legacy/loose items like notification channels).
	targetKind?: ProposalTargetKind;
	targetLabel?: string;
	effect?: PerceiveEffect;
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
	// Ontology linkage: objects and "objectId.attributeName" pairs impacted.
	affectedObjectIds?: string[];
	affectedAttributes?: string[];
	// Governance linkage: quality rules, masking policies and glossary terms
	// involved in (or created by) this perception.
	relatedRuleIds?: string[];
	relatedPolicyIds?: string[];
	relatedTermIds?: string[];
};
