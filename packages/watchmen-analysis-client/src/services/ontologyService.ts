import { Topic } from "./topicService";
import {
	VirtualOntology,
	VirtualObject,
	VirtualLink,
	DerivedAttribute,
	PhysicalTableMapping,
	virtualObjectColors,
} from "@/model/ontology";
import { API_BASE_URL, getDefaultHeaders, checkResponse } from "@/utils/apiConfig";

// ============================================================================
// Seed data — Virtual Ontology examples (used as offline fallback only)
// ============================================================================

export const INITIAL_VIRTUAL_ONTOLOGIES: VirtualOntology[] = [
	{
		id: "ont-customer",
		name: "Customer Virtual Ontology",
		description: "One unified Customer object projected from 4 physical tables of the customer domain.",
		owner: "CRM Team",
		technicalOwner: "Data Platform Team",
		tags: ["Master Data", "PII Sensitive", "Customer 360"],
		sensitivity: "confidential",
		createdAt: "2024-01-20",
		updatedAt: "2024-12-22",
		virtualObjects: [
			{
				id: "vo-customer",
				name: "Customer",
				description: "Unified customer view across person, contact, address and identifier tables.",
				icon: "👤",
				color: "bg-indigo-500",
				physicalTables: [
					{
						topicId: "t-dm-party-customer",
						topicName: "dm_party_customer",
						role: "primary",
						alias: "cust",
						fields: ["one_id", "customer_name", "customer_type"],
					},
					{
						topicId: "t-dm-party-person",
						topicName: "dm_party_person",
						role: "secondary",
						alias: "person",
						fields: ["gender", "birth_date"],
					},
					{
						topicId: "t-dm-party-contact",
						topicName: "dm_party_contact",
						role: "secondary",
						alias: "contact",
						fields: ["phone", "email"],
					},
					{
						topicId: "t-dm-party-address",
						topicName: "dm_party_address",
						role: "lookup",
						alias: "addr",
						fields: ["city", "district"],
					},
				],
				attributes: [
					{ name: "oneId", sourceTable: "cust", sourceField: "one_id" },
					{ name: "name", sourceTable: "cust", sourceField: "customer_name" },
					{ name: "phone", sourceTable: "contact", sourceField: "phone" },
				],
				derivedAttributes: [
					{
						id: "da-active-policies",
						name: "totalActivePolicies",
						description: "Count of active policies linked to this customer.",
						objectId: "vo-customer",
						aggregate: "count",
						path: ["vo-customer", "vl-customer-policy", "vo-policy"],
						targetField: "policy_id",
					},
				],
			},
			{
				id: "vo-policy",
				name: "Policy",
				description: "Insurance policy object projected from the policy domain tables.",
				icon: "📄",
				color: "bg-emerald-500",
				physicalTables: [
					{
						topicId: "t-dm-pa-policy",
						topicName: "dm_pa_policy_his",
						role: "primary",
						alias: "pol",
						fields: ["policy_id", "policy_no", "status"],
					},
				],
				attributes: [
					{ name: "policyId", sourceTable: "pol", sourceField: "policy_id" },
					{ name: "status", sourceTable: "pol", sourceField: "status" },
				],
				derivedAttributes: [],
			},
		],
		virtualLinks: [
			{
				id: "vl-customer-policy",
				name: "Customer ↔ Policy",
				sourceObjectId: "vo-customer",
				targetObjectId: "vo-policy",
				joinType: "left",
				joinConditions: [{ sourceField: "cust.one_id", targetField: "pol.policy_holder_id" }],
				description: "Link customers to their policies via one_id ↔ policy_holder_id.",
			},
		],
	},
];

// ============================================================================
// Factory functions — create empty entities with sensible defaults
// ============================================================================

export const createEmptyVirtualOntology = (): VirtualOntology => ({
	id: `ont-${Date.now()}`,
	name: "",
	description: "",
	owner: "",
	technicalOwner: "",
	tags: [],
	sensitivity: "internal",
	virtualObjects: [],
	virtualLinks: [],
	createdAt: new Date().toISOString().slice(0, 10),
	updatedAt: new Date().toISOString().slice(0, 10),
});

export const createEmptyVirtualObject = (index: number): VirtualObject => ({
	id: `vo-${Date.now()}-${index}`,
	name: "",
	description: "",
	physicalTables: [],
	attributes: [],
	derivedAttributes: [],
	icon: "📦",
	color: virtualObjectColors[index % virtualObjectColors.length],
});

export const createEmptyVirtualLink = (): VirtualLink => ({
	id: `vl-${Date.now()}`,
	name: "",
	sourceObjectId: "",
	targetObjectId: "",
	joinType: "inner",
	joinConditions: [{ sourceField: "", targetField: "" }],
	description: "",
});

export const createEmptyDerivedAttribute = (objectId: string): DerivedAttribute => ({
	id: `da-${Date.now()}`,
	name: "",
	description: "",
	objectId,
	aggregate: "count",
	path: [objectId],
	targetField: "",
});

// ============================================================================
// Helper utilities
// ============================================================================

/** Resolve physical table display label inside a virtual object. */
export const resolvePhysicalTableLabel = (mapping: PhysicalTableMapping): string => {
	return mapping.alias ? `${mapping.alias} (${mapping.topicName})` : mapping.topicName;
};

/** Build a quick lookup from topicId → Topic for field selection. */
export const buildTopicMap = (topics: Topic[]): Map<string, Topic> => {
	const map = new Map<string, Topic>();
	topics.forEach((t) => map.set(t.id, t));
	return map;
};

// ============================================================================
// Backend HTTP client
// Wires the front-end to the watchmen-rest-doll /ontology endpoints.
// ============================================================================

const ONTOLOGY_BASE = `${API_BASE_URL}/ontology`;

/** Paged list response shape from the doll backend. */
export interface DataPage<T> {
	data: T[];
	pageNumber: number;
	pageSize: number;
	total: number;
}

const buildUrl = (path: string, params?: Record<string, string | number | undefined>): string => {
	if (!params) {
		return `${ONTOLOGY_BASE}${path}`;
	}
	const search = Object.entries(params)
		.filter(([, v]) => v !== undefined && v !== null && v !== "")
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join("&");
	return search ? `${ONTOLOGY_BASE}${path}?${search}` : `${ONTOLOGY_BASE}${path}`;
};

const getJson = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
	const response = await fetch(buildUrl(path, params), {
		method: "GET",
		headers: getDefaultHeaders(),
	});
	return checkResponse(response) as Promise<T>;
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
	const response = await fetch(`${ONTOLOGY_BASE}${path}`, {
		method: "POST",
		headers: getDefaultHeaders(),
		body: JSON.stringify(body),
	});
	return checkResponse(response) as Promise<T>;
};

const deleteJson = async (path: string, params?: Record<string, string | number | undefined>): Promise<void> => {
	const response = await fetch(buildUrl(path, params), {
		method: "DELETE",
		headers: getDefaultHeaders(),
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
	}
};

/** Normalize a backend ontology record into the UI VirtualOntology shape. */
const normalizeOntology = (
	raw: Partial<VirtualOntology> & { ontologyId?: string; lastModifiedAt?: string },
): VirtualOntology => {
	const id = raw.id ?? raw.ontologyId ?? "";
	return {
		id,
		ontologyId: raw.ontologyId ?? raw.id ?? id,
		name: raw.name ?? "",
		description: raw.description ?? "",
		owner: raw.owner ?? "",
		technicalOwner: raw.technicalOwner ?? "",
		tags: raw.tags ?? [],
		sensitivity: (raw.sensitivity as VirtualOntology["sensitivity"]) ?? "internal",
		virtualObjects: raw.virtualObjects ?? [],
		virtualLinks: raw.virtualLinks ?? [],
		createdAt: raw.createdAt ?? "",
		updatedAt: raw.updatedAt ?? raw.lastModifiedAt ?? "",
	};
};

// ============================================================================
// CRUD service — backed by the watchmen-rest-doll ontology endpoints
// ============================================================================

/**
 * Load all ontologies via the paged list endpoint.
 * Falls back to local cache (if any) and finally to seed data when the API is unreachable.
 */
export const ontologyService = {
	async list(pageNumber = 1, pageSize = 200): Promise<VirtualOntology[]> {
		try {
			const page = await getJson<DataPage<VirtualOntology>>("/list", { pageNumber, pageSize });
			const list = (page.data ?? []).map(normalizeOntology);
			cacheOntologies(list);
			return list;
		} catch (e) {
			console.warn("[ontologyService.list] backend unreachable, falling back to local cache", e);
			return loadCachedOntologies();
		}
	},

	async getById(id: string): Promise<VirtualOntology> {
		const raw = await getJson<VirtualOntology>("/get", { ontologyId: id });
		return normalizeOntology(raw);
	},

	async save(ontology: VirtualOntology): Promise<VirtualOntology> {
		const payload: VirtualOntology = {
			...ontology,
			ontologyId: ontology.ontologyId ?? ontology.id,
		};
		const saved = await postJson<VirtualOntology & { ontologyId?: string }>("/save", payload);
		return normalizeOntology(saved);
	},

	async remove(id: string): Promise<void> {
		await deleteJson("/delete", { ontologyId: id });
	},
};

// ============================================================================
// Agent-view YAML helpers (CLI / AI Agent pull-push)
//
// These use the doll agent endpoints that round-trip via the backend
// `OntologyShaper`, which preserves object/link IDs by matching names.
// ============================================================================

const parseMultiYaml = (text: string): Record<string, unknown>[] => {
	const trimmed = text.replace(/^\uFEFF/, "").trim();
	if (!trimmed) {
		return [];
	}
	// very small YAML front-matter safe parse: split on document markers
	const docs = trimmed
		.split(/^---\s*$/m)
		.map((d) => d.trim())
		.filter((d) => d.length > 0);
	const result: Record<string, unknown>[] = [];
	for (const doc of docs) {
		// simple line-by-line parse into object (covers our flat agent schema)
		result.push(parseFlatYaml(doc));
	}
	return result;
};

const parseFlatYaml = (doc: string): Record<string, unknown> => {
	// Light-weight YAML parser sufficient for our agent-view schema
	// (no support for nested anchors / flow style; uses simple indentation).
	const lines = doc.split("\n");
	const root: Record<string, unknown> = {};
	const stack: { indent: number; obj: Record<string, unknown> }[] = [{ indent: -1, obj: root }];
	for (const raw of lines) {
		if (!raw.trim() || raw.trim().startsWith("#")) continue;
		const indent = raw.match(/^\s*/)?.[0].length ?? 0;
		const line = raw.trim();
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		const valueRaw = line.slice(colonIdx + 1).trim();
		while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
			stack.pop();
		}
		const parent = stack[stack.length - 1].obj;
		if (valueRaw === "" || valueRaw === "|" || valueRaw === ">") {
			// start a nested mapping
			const child: Record<string, unknown> = {};
			parent[key] = child;
			stack.push({ indent, obj: child });
		} else {
			parent[key] = stripYamlValueQuotes(valueRaw);
		}
	}
	return root;
};

const stripYamlValueQuotes = (v: string): string => {
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
		return v.slice(1, -1);
	}
	return v;
};

const dumpAgentYaml = (ontology: VirtualOntology): string => {
	const obj_by_id: Record<string, string> = {};
	ontology.virtualObjects?.forEach((vo) => {
		if (vo.id) obj_by_id[vo.id] = vo.name || "";
	});
	const lines: string[] = [];
	lines.push(`name: ${ontology.name ?? ""}`);
	lines.push(`description: ${ontology.description ?? ""}`);
	lines.push(`owner: ${ontology.owner ?? ""}`);
	lines.push(`technicalOwner: ${ontology.technicalOwner ?? ""}`);
	lines.push(`sensitivity: ${ontology.sensitivity ?? "internal"}`);
	lines.push("tags:");
	(ontology.tags ?? []).forEach((t) => lines.push(`  - ${t}`));
	lines.push("virtualObjects:");
	(ontology.virtualObjects ?? []).forEach((vo) => {
		lines.push(`  - name: ${vo.name ?? ""}`);
		lines.push(`    description: ${vo.description ?? ""}`);
		if (vo.icon) lines.push(`    icon: "${vo.icon}"`);
		if (vo.color) lines.push(`    color: ${vo.color}`);
		lines.push("    physicalTables:");
		(vo.physicalTables ?? []).forEach((pt) => {
			lines.push(`      - topicName: ${pt.topicName}`);
			lines.push(`        role: ${pt.role}`);
			if (pt.alias) lines.push(`        alias: ${pt.alias}`);
			lines.push("        fields:");
			(pt.fields ?? []).forEach((f) => lines.push(`          - ${f}`));
		});
		lines.push("    attributes:");
		(vo.attributes ?? []).forEach((a) => {
			lines.push(`      - name: ${a.name}`);
			lines.push(`        sourceTable: ${a.sourceTable}`);
			lines.push(`        sourceField: ${a.sourceField}`);
		});
		lines.push("    derivedAttributes:");
		(vo.derivedAttributes ?? []).forEach((da) => {
			lines.push(`      - name: ${da.name}`);
			if (da.description) lines.push(`        description: ${da.description}`);
			lines.push(`        aggregate: ${da.aggregate}`);
			lines.push("        path:");
			(da.path ?? []).forEach((p) => lines.push(`          - ${p}`));
			if (da.targetField) lines.push(`        targetField: ${da.targetField}`);
		});
	});
	lines.push("virtualLinks:");
	(ontology.virtualLinks ?? []).forEach((vl) => {
		lines.push(`  - name: ${vl.name ?? ""}`);
		lines.push(`    sourceObjectName: ${obj_by_id[vl.sourceObjectId ?? ""] ?? ""}`);
		lines.push(`    targetObjectName: ${obj_by_id[vl.targetObjectId ?? ""] ?? ""}`);
		lines.push(`    joinType: ${vl.joinType ?? "inner"}`);
		lines.push("    joinConditions:");
		(vl.joinConditions ?? []).forEach((jc) => {
			lines.push(`      - sourceField: ${jc.sourceField ?? ""}`);
			lines.push(`        targetField: ${jc.targetField ?? ""}`);
		});
		if (vl.description) lines.push(`    description: ${vl.description}`);
	});
	return lines.join("\n");
};

const mergeAgentYamlIntoOntology = (raw: Record<string, unknown>, existing: VirtualOntology): VirtualOntology => {
	const obj_by_name: Record<string, VirtualObject> = {};
	(existing.virtualObjects ?? []).forEach((vo) => {
		if (vo.name) obj_by_name[vo.name] = vo;
	});

	const virtualObjects: VirtualObject[] = ((raw.virtualObjects as Record<string, unknown>[]) ?? []).map((vo_raw) => {
		const vo_name = String(vo_raw.name ?? "");
		const existing_vo = obj_by_name[vo_name];
		return {
			id: existing_vo?.id ?? `vo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			name: vo_name,
			description: String(vo_raw.description ?? ""),
			icon: vo_raw.icon ? String(vo_raw.icon) : existing_vo?.icon,
			color: vo_raw.color ? String(vo_raw.color) : existing_vo?.color,
			physicalTables: ((vo_raw.physicalTables as Record<string, unknown>[]) ?? []).map((pt) => ({
				topicId: "",
				topicName: String(pt.topicName ?? ""),
				alias: pt.alias ? String(pt.alias) : undefined,
				role: String(pt.role ?? "primary") as PhysicalTableMapping["role"],
				fields: ((pt.fields as string[]) ?? []).map((f) => String(f)),
			})),
			attributes: ((vo_raw.attributes as Record<string, unknown>[]) ?? []).map((a) => ({
				name: String(a.name ?? ""),
				sourceTable: String(a.sourceTable ?? ""),
				sourceField: String(a.sourceField ?? ""),
			})),
			derivedAttributes: ((vo_raw.derivedAttributes as Record<string, unknown>[]) ?? []).map((da) => ({
				id: `da-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				name: String(da.name ?? ""),
				description: String(da.description ?? ""),
				aggregate: String(da.aggregate ?? "count"),
				path: ((da.path as string[]) ?? []).map((p) => String(p)),
				targetField: da.targetField ? String(da.targetField) : undefined,
			})),
		} as VirtualObject;
	});

	const new_obj_by_name: Record<string, VirtualObject> = {};
	virtualObjects.forEach((vo) => {
		if (vo.name) new_obj_by_name[vo.name] = vo;
	});

	const virtualLinks: VirtualLink[] = ((raw.virtualLinks as Record<string, unknown>[]) ?? []).map((vl_raw) => ({
		id: `vl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		name: String(vl_raw.name ?? ""),
		sourceObjectId: new_obj_by_name[String(vl_raw.sourceObjectName ?? "")]?.id ?? "",
		targetObjectId: new_obj_by_name[String(vl_raw.targetObjectName ?? "")]?.id ?? "",
		joinType: String(vl_raw.joinType ?? "inner") as VirtualLink["joinType"],
		joinConditions: ((vl_raw.joinConditions as Record<string, unknown>[]) ?? []).map((jc) => ({
			sourceField: String(jc.sourceField ?? ""),
			targetField: String(jc.targetField ?? ""),
		})),
		description: vl_raw.description ? String(vl_raw.description) : undefined,
	}));

	return {
		...existing,
		name: String(raw.name ?? existing.name ?? ""),
		description: String(raw.description ?? existing.description ?? ""),
		owner: String(raw.owner ?? existing.owner ?? ""),
		technicalOwner: String(raw.technicalOwner ?? existing.technicalOwner ?? ""),
		tags: (raw.tags as string[]) ?? existing.tags ?? [],
		sensitivity: String(raw.sensitivity ?? existing.sensitivity ?? "internal") as VirtualOntology["sensitivity"],
		virtualObjects,
		virtualLinks,
		updatedAt: new Date().toISOString().slice(0, 10),
	};
};

export const ontologyYamlService = {
	/** Pull all ontologies in agent-view YAML via the doll backend. */
	async pullAll(): Promise<string> {
		const response = await fetch(`${ONTOLOGY_BASE}/all/yaml/agent-view`, {
			method: "GET",
			headers: { ...getDefaultHeaders(), Accept: "application/x-yaml" },
		});
		if (!response.ok) {
			throw new Error(`Failed to pull ontologies: ${response.statusText}`);
		}
		return response.text();
	},

	/** Pull a single ontology by name in agent-view YAML. */
	async pullByName(name: string): Promise<string> {
		const response = await fetch(`${ONTOLOGY_BASE}/name/yaml/agent-view?name=${encodeURIComponent(name)}`, {
			method: "GET",
			headers: { ...getDefaultHeaders(), Accept: "application/x-yaml" },
		});
		if (!response.ok) {
			throw new Error(`Failed to pull ontology [${name}]: ${response.statusText}`);
		}
		return response.text();
	},

	/** Push a single ontology YAML to the doll backend (upsert). */
	async pushOne(ontology: VirtualOntology): Promise<void> {
		const yamlText = dumpAgentYaml(ontology);
		const response = await fetch(`${ONTOLOGY_BASE}/yaml/agent-upsert`, {
			method: "POST",
			headers: { ...getDefaultHeaders(), "Content-Type": "application/x-yaml" },
			body: yamlText,
		});
		if (!response.ok) {
			const error = await response.text().catch(() => "");
			throw new Error(error || `Failed to push ontology [${ontology.name}]: ${response.statusText}`);
		}
	},

	/** Convert a multi-doc YAML blob returned by `pullAll` into UI models. */
	parseAll(yamlText: string): VirtualOntology[] {
		return parseMultiYaml(yamlText).map((raw) => mergeAgentYamlIntoOntology(raw, createEmptyVirtualOntology()));
	},
};

// ============================================================================
// Local cache helpers (offline fallback only)
// ============================================================================

const CACHE_KEY = "virtual-ontologies";

const cacheOntologies = (list: VirtualOntology[]): void => {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(list));
	} catch {
		/* ignore quota errors */
	}
};

const loadCachedOntologies = (): VirtualOntology[] => {
	try {
		const stored = localStorage.getItem(CACHE_KEY);
		if (stored) {
			return JSON.parse(stored) as VirtualOntology[];
		}
	} catch {
		/* ignore */
	}
	return INITIAL_VIRTUAL_ONTOLOGIES;
};
