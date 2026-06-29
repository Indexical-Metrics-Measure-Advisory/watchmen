// ============================================================================
// Virtual Ontology Data Model
// Business (Virtual Object) → Mapping (Link/Field) → Physical (Topic/Table)
//
// Pure type definitions + static UI display configs.
// Factories, helpers, seed data and persistence live in services/ontologyService.ts
// ============================================================================

export type OntologySensitivity = "public" | "internal" | "confidential" | "restricted";

/** A physical table / topic mapped into a virtual object. */
export interface JoinCondition {
	sourceField: string;
	targetField: string;
}

export interface PhysicalTableMapping {
	topicId: string;
	topicName: string;
	/** Optional alias used inside this virtual object, e.g. "cust" for dm_party_customer */
	alias?: string;
	/** Business role of this physical table within the virtual object */
	kind: PhysicalTableKind;
	/** JOIN behaviour when joining to primary: undefined = derive from kind */
	joinType?: PhysicalTableJoinType;
	/** Factor names selected from this physical table that the virtual object exposes */
	fields: string[];
	/** Join from primary table to this table; sourceField is primary field, targetField is current table field. */
	joinConditions?: JoinCondition[];
}

export type PhysicalTableKind = "primary" | "detail" | "profile" | "metric" | "tag" | "lookup";
export type PhysicalTableJoinType = "inner" | "left" | "right" | "full";

/** A link between two virtual objects, resolved via physical table JOIN rules. */
export interface VirtualLink {
	id: string;
	name: string;
	/** Source virtual object id */
	sourceObjectId: string;
	/** Target virtual object id */
	targetObjectId: string;
	/** JOIN type used to resolve the link */
	joinType: "inner" | "left" | "right" | "full";
	/** Join conditions: source physical field → target physical field */
	joinConditions: JoinCondition[];
	/** Optional human-readable description of this link */
	description?: string;
}

/** A derived attribute computed by traversing the virtual link graph. */
export interface DerivedAttribute {
	id: string;
	name: string;
	description?: string;
	/** The virtual object this derived attribute belongs to */
	objectId: string;
	/** Aggregation / arithmetic type */
	aggregate: "count" | "sum" | "avg" | "min" | "max" | "none";
	/** Traversal path: [objectId, linkId, objectId, ...] */
	path: string[];
	/** Final field name used in aggregation */
	targetField?: string;
}

/** A virtual object: the semantic projection of multiple physical tables. */
export interface VirtualObject {
	id: string;
	name: string;
	description: string;
	/** Data source (DataProfile) this virtual object is bound to. */
	datasourceId?: string;
	/** Physical tables projected into this virtual object */
	physicalTables: PhysicalTableMapping[];
	/** Business attributes (field name → source physical table.field) */
	attributes: { name: string; sourceTable: string; sourceField: string }[];
	/** Derived attributes attached to this virtual object */
	derivedAttributes: DerivedAttribute[];
	/** Icon / emoji used in UI */
	icon?: string;
	/** Color used in UI graph */
	color?: string;
}

export interface VirtualOntology {
	id: string;
	/** Backend ontology id (same as id, kept for backend round-trip). */
	ontologyId?: string;
	/** Optimistic-lock version, returned by the backend and required for subsequent saves. */
	version?: number;
	name: string;
	description: string;
	owner: string;
	technicalOwner: string;
	tags: string[];
	sensitivity: OntologySensitivity;
	virtualObjects: VirtualObject[];
	virtualLinks: VirtualLink[];
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// Static UI display configs
// ============================================================================

export const sensitivityConfig: Record<OntologySensitivity, { label: string; className: string; icon: string }> = {
	public: { label: "Public", className: "bg-green-100 text-green-700", icon: "🌍" },
	internal: { label: "Internal", className: "bg-blue-100 text-blue-700", icon: "🏢" },
	confidential: { label: "Confidential", className: "bg-orange-100 text-orange-700", icon: "🔒" },
	restricted: { label: "Restricted", className: "bg-red-100 text-red-700", icon: "🚨" },
};

export const physicalTableKindConfig: Record<
	PhysicalTableKind,
	{ label: string; className: string; icon: string; defaultJoinType: PhysicalTableJoinType }
> = {
	primary: { label: "Primary", className: "bg-indigo-100 text-indigo-700", icon: "⭐", defaultJoinType: "inner" },
	detail: { label: "Detail", className: "bg-slate-100 text-slate-700", icon: "📎", defaultJoinType: "left" },
	profile: { label: "Profile", className: "bg-blue-100 text-blue-700", icon: "◇", defaultJoinType: "left" },
	metric: { label: "Metric", className: "bg-emerald-100 text-emerald-700", icon: "Σ", defaultJoinType: "left" },
	tag: { label: "Tag", className: "bg-fuchsia-100 text-fuchsia-700", icon: "#", defaultJoinType: "left" },
	lookup: { label: "Lookup", className: "bg-amber-100 text-amber-700", icon: "🔍", defaultJoinType: "inner" },
};

export const physicalTableJoinTypeConfig: Record<PhysicalTableJoinType, { label: string; className: string }> = {
	inner: { label: "INNER", className: "bg-blue-100 text-blue-700" },
	left: { label: "LEFT", className: "bg-emerald-100 text-emerald-700" },
	right: { label: "RIGHT", className: "bg-amber-100 text-amber-700" },
	full: { label: "FULL", className: "bg-purple-100 text-purple-700" },
};

export const joinTypeConfig: Record<VirtualLink["joinType"], { label: string; className: string }> = {
	inner: { label: "INNER JOIN", className: "bg-blue-100 text-blue-700" },
	left: { label: "LEFT JOIN", className: "bg-emerald-100 text-emerald-700" },
	right: { label: "RIGHT JOIN", className: "bg-amber-100 text-amber-700" },
	full: { label: "FULL JOIN", className: "bg-purple-100 text-purple-700" },
};

export const aggregateConfig: Record<DerivedAttribute["aggregate"], { label: string; icon: string }> = {
	count: { label: "COUNT", icon: "#" },
	sum: { label: "SUM", icon: "Σ" },
	avg: { label: "AVG", icon: "μ" },
	min: { label: "MIN", icon: "↓" },
	max: { label: "MAX", icon: "↑" },
	none: { label: "VALUE", icon: "•" },
};

export const virtualObjectColors = [
	"bg-indigo-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-blue-500",
	"bg-purple-500",
	"bg-cyan-500",
	"bg-orange-500",
];
