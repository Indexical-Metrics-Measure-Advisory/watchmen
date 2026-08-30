import { HealthStatus } from './common';

// Ontology model mirrors the backend VirtualOntology shapes
// (packages/watchmen-model/src/watchmen_model/admin/ontology.py):
// VirtualObject -> OntologyObject, VirtualObjectAttribute -> OntologyAttribute,
// DerivedAttribute -> OntologyDerivedAttribute, VirtualLink -> OntologyLink.

export type OntologySensitivity = 'public' | 'internal' | 'confidential' | 'restricted';

export type OntologyAttribute = {
	name: string;
	label: string;
	// Resolved factor type from the backing Topic/Factor.
	type: string;
	// Physical mapping: PhysicalTableMapping.topicName + VirtualObjectAttribute.sourceField.
	sourceTopic: string;
	sourceFactor: string;
	encrypted?: boolean;
	sensitive?: boolean;
	// True for attributes proposed by the Agent and not yet materialized by a pipeline.
	pending?: boolean;
	// Masking policy applied to this attribute, if any.
	maskedBy?: string;
	// Quality rules targeting the backing (topic, factor).
	qualityRuleIds?: string[];
	glossaryTermIds?: string[];
};

export type OntologyDerivedAttribute = {
	id: string;
	name: string;
	label: string;
	description?: string;
	// Aggregation applied at the end of the path (sum / count / avg / ...).
	aggregate: string;
	// Object/link hop sequence, resolved like backend DerivedAttribute.path.
	path: string[];
	targetField: string;
};

export type OntologyObject = {
	id: string;
	name: string;
	displayName: string;
	description?: string;
	domain: string;
	icon: string;
	color: string;
	sensitivity: OntologySensitivity;
	healthStatus: HealthStatus;
	// Primary physical table mapping (kind = 'primary').
	primaryTopicId: string;
	// All topics materializing this object (primary + detail/profile mappings).
	sourceTopicIds: string[];
	attributes: OntologyAttribute[];
	derivedAttributes: OntologyDerivedAttribute[];
};

export type OntologyCardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export type OntologyLink = {
	id: string;
	name: string;
	sourceObjectId: string;
	targetObjectId: string;
	cardinality: OntologyCardinality;
	// Human readable join conditions summary (sourceField = targetField, ...).
	joinDescription?: string;
	description?: string;
};

export type GlossaryTermStatus = 'active' | 'draft' | 'deprecated';

export type GlossaryTerm = {
	id: string;
	name: string;
	displayName: string;
	definition: string;
	status: GlossaryTermStatus;
	category: string;
	relatedObjectIds: string[];
	// "objectId.attributeName" pairs anchoring the term to attributes.
	relatedAttributes: string[];
	// Provenance: scenario id when created/updated by a perception proposal.
	createdBy?: string;
};

export type OntologyView = 'overview' | 'graph' | 'objects';

export type OntologyCatalogFilter = {
	search: string;
	domain: string;
	sensitivity: string;
};
