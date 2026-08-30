import {
	GlossaryTerm,
	MaskingPolicy,
	OntologyAttribute,
	OntologyLink,
	OntologyObject,
	Topic,
} from "../models";
import { findMaskingPolicy } from "./masking";

export const getOntologyDomainList = (objects: OntologyObject[]) => {
	return [...new Set(objects.map((o) => o.domain))];
};

export const getOntologyStats = (objects: OntologyObject[], links: OntologyLink[], topics: Topic[]) => {
	const attributes = objects.reduce((sum, o) => sum + o.attributes.length, 0);
	const derivedAttributes = objects.reduce((sum, o) => sum + o.derivedAttributes.length, 0);

	// A topic is "ontologized" when at least one object maps onto it.
	const mappedTopicIds = new Set(objects.flatMap((o) => o.sourceTopicIds));
	const coveredTopics = topics.filter((t) => mappedTopicIds.has(t.topicId)).length;

	return {
		objects: objects.length,
		links: links.length,
		attributes,
		derivedAttributes,
		totalTopics: topics.length,
		coveredTopics,
		uncoveredTopics: topics.length - coveredTopics,
		coverage: topics.length > 0 ? Math.round((coveredTopics / topics.length) * 100) : 0,
		sensitiveAttributes: attributesOf(objects).filter((a) => a.sensitive).length,
		healthyObjects: objects.filter((o) => o.healthStatus === "healthy").length,
		warningObjects: objects.filter((o) => o.healthStatus === "warning").length,
		errorObjects: objects.filter((o) => o.healthStatus === "error").length,
	};
};

const attributesOf = (objects: OntologyObject[]): OntologyAttribute[] => {
	return objects.flatMap((o) => o.attributes);
};

export const getObjectsByDomain = (objects: OntologyObject[], domain: string) => {
	return objects.filter((o) => o.domain === domain);
};

export const getObjectById = (objects: OntologyObject[], objectId: string | null) => {
	if (!objectId) return null;
	return objects.find((o) => o.id === objectId) || null;
};

export const getLinksForObject = (links: OntologyLink[], objectId: string) => {
	return links.filter((l) => l.sourceObjectId === objectId || l.targetObjectId === objectId);
};

export const getTopicsWithoutObject = (objects: OntologyObject[], topics: Topic[]) => {
	const mappedTopicIds = new Set(objects.flatMap((o) => o.sourceTopicIds));
	return topics.filter((t) => !mappedTopicIds.has(t.topicId));
};

export const getObjectsForTopic = (objects: OntologyObject[], topicId: string) => {
	return objects.filter((o) => o.sourceTopicIds.includes(topicId));
};

// Resolve objects referenced by a quality rule or masking policy via its
// targetTopic name (rules/policies target topics by name, objects by id).
// Falls back to prefix matching so observability node names like "sales_order"
// resolve to topics like "sales_order_curated".
export const getObjectsForTopicName = (objects: OntologyObject[], topicName: string, topics: Topic[]) => {
	const topic =
		topics.find((t) => t.name === topicName) || topics.find((t) => t.name.startsWith(topicName));
	if (!topic) return [];
	return objects.filter((o) => o.sourceTopicIds.includes(topic.topicId));
};

export const getGlossaryTermById = (terms: GlossaryTerm[], termId: string) => {
	return terms.find((t) => t.id === termId) || null;
};

export const getTermsForObject = (terms: GlossaryTerm[], objectId: string) => {
	return terms.filter((t) => t.relatedObjectIds.includes(objectId));
};

// Attribute-level governance rollup: how well the object is covered by
// quality rules, masking policies and glossary terms.
export const getAttributeGovernance = (attribute: OntologyAttribute, policies: MaskingPolicy[]) => {
	// Governing policy: explicit maskedBy link (kept even when disabled so the
	// UI can flag "policy disabled"), or any enabled policy targeting the
	// attribute's (topic, factor).
	const policy = findMaskingPolicy(attribute, policies);
	const qualityRules = attribute.qualityRuleIds?.length || 0;
	const glossary = attribute.glossaryTermIds?.length || 0;

	// 0-100 score per attribute: quality rules + masking + glossary coverage.
	let score = 0;
	score += Math.min(qualityRules, 2) * 25;
	if (policy && policy.enabled) score += 30;
	if (glossary > 0) score += 20;
	if (attribute.sensitive && (!policy || !policy.enabled)) score = Math.max(0, score - 20);

	return {
		qualityRules,
		ruleIds: attribute.qualityRuleIds || [],
		masked: Boolean(policy),
		maskEnabled: Boolean(policy?.enabled),
		maskStrategy: policy?.strategy || '',
		glossary,
		score: Math.max(0, Math.min(100, score)),
		uncoveredSensitivity: attribute.sensitive && (!policy || !policy.enabled),
	};
};

export const getObjectGovernanceScore = (object: OntologyObject, policies: MaskingPolicy[]) => {
	if (object.attributes.length === 0) return 0;
	const scores = object.attributes.map((a) => getAttributeGovernance(a, policies).score);
	return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
};
