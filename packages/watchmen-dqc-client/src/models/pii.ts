// PII classification models — mirror watchmen-pii-classification pydantic models.
// Source: packages/watchmen-pii-classification/src/watchmen_pii/model/{pii_term,discovery,report}.py
// Endpoints: /dqc/pii-terms**, /dqc/pii-report (router/pii_router.py), mounted by
// watchmen-rest-dqc only when PII_CLASSIFICATION_ENABLED is on.

/** Predefined PII categories (pii_term.py). */
export const PII_CATEGORIES = ['客户数据', '业务数据', '经营管理数据', '监管数据'] as const;

/** Sensitivity levels (pii_term.py). */
export const PII_SENSITIVITY_LEVELS = ['1级', '2级'] as const;

/** Match strategies (pii_term.py). */
export enum PiiMatchStrategy {
	LOGIC = 'logic',
	AI = 'ai',
	LOGIC_AND_AI = 'logic+ai',
}

/** Match sources (pii_term.py). */
export enum PiiMatchSource {
	TYPE = 'type',
	KEYWORD = 'keyword',
	AI = 'ai',
}

/** `LinkedFactor` model — a factor associated with a term. */
export interface LinkedFactor {
	topicId: string;
	topicName?: string;
	factorId: string;
	factorName?: string;
	factorLabel?: string;
	factorType?: string;
	matchConfidence?: number;
	matchSource?: string;
	confirmed?: boolean;
}

/** `PIIClassificationTerm` model (tenant-scoped tuple with optimistic lock). */
export interface PIIClassificationTerm {
	termId?: string;
	name: string;
	description?: string;
	category?: string;
	sensitivityLevel?: string;
	dataLevel?: string;
	ownerDepartment?: string;
	matchStrategy?: string;
	factorTypePatterns?: string[];
	keywordPatterns?: string[];
	linkedFactors?: LinkedFactor[];
	tenantId?: string;
	version?: number;
}

/** `DiscoverRequest` model — body of POST /dqc/pii-terms/{termId}/discover. */
export interface DiscoverRequest {
	strategy?: string;
	score_threshold?: number;
}

/** `DiscoverResult` model. */
export interface DiscoverResult {
	termId: string;
	linkedFactors: LinkedFactor[];
	totalCount: number;
}

/** `ConfirmRequest` model — body of POST /dqc/pii-terms/{termId}/confirm. */
export interface ConfirmRequest {
	factorIds: string[];
	removeFactorIds: string[];
}

/** `PiiTraceStep` model — one hop in a lineage trace route. */
export interface PiiTraceStep {
	kind: string;
	topicId?: string;
	topicName?: string;
	factorId?: string;
	factorName?: string;
	pipelineId?: string;
	pipelineName?: string;
	sourceTableName?: string;
	sourceFieldName?: string;
}

/** `PiiTraceRoute` model — a single traced path. */
export interface PiiTraceRoute {
	id: string;
	title: string;
	steps: PiiTraceStep[];
	diagnostics: string[];
}

/** `PiiMetricRef` model. */
export interface PiiMetricRef {
	metricId?: string;
	metricName: string;
	topicId?: string;
}

/** `PiiGraphData` model. */
export interface PiiGraphData {
	nodes: Array<Record<string, any>>;
	edges: Array<Record<string, any>>;
}

/** `PiiEncryptionCoverage` model. */
export interface PiiEncryptionCoverage {
	total: number;
	encrypted: number;
	plaintext: number;
}

/** `PiiLineageReport` model — response of POST /dqc/pii-terms/{termId}/lineage. */
export interface PiiLineageReport {
	termId: string;
	termName?: string;
	sensitivityLevel?: string;
	linkedFactors: LinkedFactor[];
	upstreamRoutes: PiiTraceRoute[];
	downstreamRoutes: PiiTraceRoute[];
	metrics: PiiMetricRef[];
	graphData: PiiGraphData;
	encryptionCoverage: PiiEncryptionCoverage;
	maxUpstreamDepth: number;
	maxDownstreamDepth: number;
}

/** `PiiTermOverview` model — one row in the global overview table. */
export interface PiiTermOverview {
	termId?: string;
	termName: string;
	sensitivityLevel?: string;
	category?: string;
	linkedFactorCount: number;
	topicCount: number;
	pipelineCount: number;
	metricCount: number;
	encryptedFactorCount: number;
	plaintextFactorCount: number;
	maxUpstreamDepth: number;
	maxDownstreamDepth: number;
}

/** `PiiGlobalDashboard` model — response of GET /dqc/pii-report. */
export interface PiiGlobalDashboard {
	totalTerms: number;
	bySensitivityLevel: Record<string, number>;
	byCategory: Record<string, number>;
	highRiskTerms: PiiTermOverview[];
	topImpactTerms: PiiTermOverview[];
	terms: PiiTermOverview[];
}
