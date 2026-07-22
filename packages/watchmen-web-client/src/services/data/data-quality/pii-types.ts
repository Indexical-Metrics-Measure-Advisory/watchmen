import {DateTime} from '../types';

export type PiiTermId = string;

/** sensitivity levels, values are defined by backend */
export enum PiiSensitivityLevel {
	LEVEL_1 = '1级',
	LEVEL_2 = '2级'
}

/** data categories, values are defined by backend */
export enum PiiCategory {
	CUSTOMER = '客户数据',
	BUSINESS = '业务数据',
	OPERATION = '经营管理数据',
	REGULATORY = '监管数据'
}

export enum PiiMatchStrategy {
	LOGIC = 'logic',
	AI = 'ai',
	LOGIC_AND_AI = 'logic+ai'
}

export enum PiiMatchSource {
	TYPE = 'type',
	KEYWORD = 'keyword',
	AI = 'ai'
}

export interface PiiLinkedFactor {
	topicId: string;
	topicName?: string;
	factorId: string;
	factorName?: string;
	factorLabel?: string;
	factorType?: string;
	/** 0 - 1 */
	matchConfidence: number;
	matchSource: PiiMatchSource;
	confirmed: boolean;
}

export interface PiiClassificationTerm {
	termId?: PiiTermId;
	tenantId?: string;
	name: string;
	description?: string;
	category?: PiiCategory | string;
	sensitivityLevel?: PiiSensitivityLevel | string;
	dataLevel?: string;
	ownerDepartment?: string;
	matchStrategy: PiiMatchStrategy | string;
	factorTypePatterns: Array<string>;
	keywordPatterns: Array<string>;
	linkedFactors: Array<PiiLinkedFactor>;
	createdAt?: DateTime;
	lastModifiedAt?: DateTime;
	version?: number;
}

export interface PiiDiscoverResult {
	termId: PiiTermId;
	linkedFactors: Array<PiiLinkedFactor>;
	totalCount: number;
}

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

export interface PiiTraceRoute {
	id: string;
	title: string;
	steps: Array<PiiTraceStep>;
	diagnostics: Array<string>;
}

export interface PiiMetricRef {
	metricId?: string;
	metricName: string;
	topicId?: string;
}

export interface PiiGraphNode {
	id: string;
	type: string;
	name: string;
	[key: string]: any;
}

export interface PiiGraphEdge {
	from: string;
	to: string;
	kind: string;
	[key: string]: any;
}

export interface PiiGraphData {
	nodes: Array<PiiGraphNode>;
	edges: Array<PiiGraphEdge>;
}

export interface PiiEncryptionCoverage {
	total: number;
	encrypted: number;
	plaintext: number;
}

export interface PiiLineageReport {
	termId: PiiTermId;
	termName?: string;
	sensitivityLevel?: string;
	linkedFactors: Array<PiiLinkedFactor>;
	upstreamRoutes: Array<PiiTraceRoute>;
	downstreamRoutes: Array<PiiTraceRoute>;
	metrics: Array<PiiMetricRef>;
	graphData: PiiGraphData;
	encryptionCoverage: PiiEncryptionCoverage;
	maxUpstreamDepth: number;
	maxDownstreamDepth: number;
}

export interface PiiTermOverview {
	termId?: PiiTermId;
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

export interface PiiGlobalDashboard {
	totalTerms: number;
	bySensitivityLevel: Record<string, number>;
	byCategory: Record<string, number>;
	highRiskTerms: Array<PiiTermOverview>;
	topImpactTerms: Array<PiiTermOverview>;
	terms: Array<PiiTermOverview>;
}

export const PII_SENSITIVITY_LEVEL_LABELS: Record<string, string> = {
	[PiiSensitivityLevel.LEVEL_1]: 'Level 1',
	[PiiSensitivityLevel.LEVEL_2]: 'Level 2'
};

export const PII_CATEGORY_LABELS: Record<string, string> = {
	[PiiCategory.CUSTOMER]: 'Customer Data',
	[PiiCategory.BUSINESS]: 'Business Data',
	[PiiCategory.OPERATION]: 'Operation Data',
	[PiiCategory.REGULATORY]: 'Regulatory Data'
};

export const PII_MATCH_STRATEGY_LABELS: Record<string, string> = {
	[PiiMatchStrategy.LOGIC]: 'Logic',
	[PiiMatchStrategy.AI]: 'AI',
	[PiiMatchStrategy.LOGIC_AND_AI]: 'Logic + AI'
};

export const PII_MATCH_SOURCE_LABELS: Record<string, string> = {
	[PiiMatchSource.TYPE]: 'Type',
	[PiiMatchSource.KEYWORD]: 'Keyword',
	[PiiMatchSource.AI]: 'AI'
};

export const asPiiLevelLabel = (level?: string): string => {
	return (level && PII_SENSITIVITY_LEVEL_LABELS[level]) || level || '-';
};

export const asPiiCategoryLabel = (category?: string): string => {
	return (category && PII_CATEGORY_LABELS[category]) || category || '-';
};

export const asPiiStrategyLabel = (strategy?: string): string => {
	return (strategy && PII_MATCH_STRATEGY_LABELS[strategy]) || strategy || '-';
};

export const asPiiMatchSourceLabel = (source?: string): string => {
	return (source && PII_MATCH_SOURCE_LABELS[source]) || source || '-';
};
