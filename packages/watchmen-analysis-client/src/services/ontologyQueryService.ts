// ============================================================================
// Ontology Data Access Service
// 调用 watchmen-metricflow 的本体论数据访问端点：
//   POST /ontology/{ontologyId}/query/compile  — 仅编译 SQL，用于调试预览
//   POST /ontology/{ontologyId}/query          — 编译并执行，返回数据行
// 请求/响应 schema 对应 watchmen_metricflow.ontology.schema。
// ============================================================================

import { API_BASE_URL, getDefaultHeaders } from "@/utils/apiConfig";

/** 排序项：field 为 attribute 名或请求的衍生属性名，direction 为排序方向。 */
export interface OntologyOrderBy {
	field: string;
	direction: "asc" | "desc";
}

/** 运行时查询请求（对应后端 OntologyQueryRequest）。 */
export interface OntologyQueryRequest {
	/** 虚拟对象 ID（VirtualObject.id）。 */
	virtualObjectId: string;
	/**
	 * 字段名 → 过滤条件；键必须是虚拟对象的 attribute 名。后端可通过 ONTOLOGY_QUERY_REQUIRE_FILTERS 配置是否强制。
	 * 值为标量时表示等值过滤；也可以是 { operator, value } 对象（operator 如 gt/gte/lt/lte/eq/ne 等）。
	 */
	filters?: Record<string, unknown>;
	/** 排序规则；数组顺序即排序优先级。 */
	orderBy?: OntologyOrderBy[];
	/** 需返回的属性名；空 = 返回全部 attribute。 */
	fields?: string[];
	/** 需计算的衍生属性名。 */
	includeDerived?: string[];
	/** 最大返回行数，1..10000。 */
	limit?: number;
	/** 分页偏移。 */
	offset?: number;
}

/** compile 端点返回结构。 */
export interface OntologyCompileResult {
	virtualObject: string;
	/** 编译后的 SELECT SQL 文本。 */
	sql: string;
	/** SELECT 列顺序对应的 label 列表。 */
	labels: string[];
}

/** query 端点返回结构（对应后端 OntologyQueryResponse）。 */
export interface OntologyQueryResult {
	virtualObject: string;
	/** 业务数据行，每行是 label → value。 */
	rows: Record<string, unknown>[];
	/** 满足条件的总行数（可选）。 */
	total?: number | null;
}

const buildUrl = (ontologyId: string, sub: "query" | "query/compile"): string =>
	`${API_BASE_URL}/ontology/${encodeURIComponent(ontologyId)}/${sub}`;

const postJson = async <T>(url: string, body: unknown): Promise<T> => {
	const response = await fetch(url, {
		method: "POST",
		headers: getDefaultHeaders(),
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		const err = await response.json().catch(() => ({}));
		const msg =
			(err as { message?: string; detail?: string }).message ??
			(err as { detail?: string }).detail ??
			`HTTP ${response.status}`;
		throw new Error(msg);
	}
	return (await response.json()) as T;
};

export const ontologyQueryService = {
	/**
	 * 仅编译 SQL，不执行。用于"预览生成的 SQL"。
	 * 不会触碰业务数据库，可在无数据源环境验证本体论配置。
	 */
	async compile(ontologyId: string, request: OntologyQueryRequest): Promise<OntologyCompileResult> {
		return postJson<OntologyCompileResult>(buildUrl(ontologyId, "query/compile"), request);
	},

	/**
	 * 编译并执行查询，返回数据行。
	 * 依赖虚拟对象绑定的 datasourceId；未绑定数据源时返回空 rows。
	 */
	async query(ontologyId: string, request: OntologyQueryRequest): Promise<OntologyQueryResult> {
		return postJson<OntologyQueryResult>(buildUrl(ontologyId, "query"), request);
	},
};
