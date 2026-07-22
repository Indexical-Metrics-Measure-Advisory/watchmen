import {
	PiiCategory,
	PiiClassificationTerm,
	PiiDiscoverResult,
	PiiGlobalDashboard,
	PiiLineageReport,
	PiiLinkedFactor,
	PiiMatchSource,
	PiiMatchStrategy,
	PiiSensitivityLevel,
	PiiTermOverview
} from '../../data-quality/pii-types';

const MOCK_DELAY = 300;

const delayed = <T>(data: T): Promise<T> => {
	return new Promise<T>(resolve => setTimeout(() => resolve(data), MOCK_DELAY));
};

const now = (): string => new Date().toISOString();

let termIdSeq = 100;

const createMockTerm = (options: {
	termId: string;
	name: string;
	category: PiiCategory;
	sensitivityLevel: PiiSensitivityLevel;
	matchStrategy?: PiiMatchStrategy;
	factorTypePatterns?: Array<string>;
	keywordPatterns?: Array<string>;
	linkedFactors?: Array<PiiLinkedFactor>;
}): PiiClassificationTerm => {
	return {
		termId: options.termId,
		tenantId: '1',
		name: options.name,
		category: options.category,
		sensitivityLevel: options.sensitivityLevel,
		matchStrategy: options.matchStrategy ?? PiiMatchStrategy.LOGIC_AND_AI,
		factorTypePatterns: options.factorTypePatterns ?? [],
		keywordPatterns: options.keywordPatterns ?? [],
		linkedFactors: options.linkedFactors ?? [],
		createdAt: now(),
		lastModifiedAt: now(),
		version: 1
	};
};

// the 11 built-in seed terms, mirrors backend watchmen_pii.seed.pii_term_seed
let mockTerms: Array<PiiClassificationTerm> = [
	createMockTerm({
		termId: '1', name: '证件号码', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		factorTypePatterns: ['id-no'], keywordPatterns: ['证件号', 'id_card', 'id_no', 'identity']
	}),
	createMockTerm({
		termId: '2', name: '客户姓名', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		keywordPatterns: ['姓名', 'name', 'customer_name', 'full_name']
	}),
	createMockTerm({
		termId: '3', name: '出生日期', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		factorTypePatterns: ['date-of-birth'], keywordPatterns: ['出生日期', 'birth', 'birthday', 'dob']
	}),
	createMockTerm({
		termId: '4', name: '手机号码', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		factorTypePatterns: ['mobile', 'phone'], keywordPatterns: ['手机', 'mobile', 'phone', 'cell']
	}),
	createMockTerm({
		termId: '5', name: '家庭住址', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		factorTypePatterns: ['address', 'province', 'city', 'district'], keywordPatterns: ['住址', 'address', 'home']
	}),
	createMockTerm({
		termId: '6', name: '邮箱地址', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		factorTypePatterns: ['email'], keywordPatterns: ['邮箱', 'email', 'mail']
	}),
	createMockTerm({
		termId: '7', name: '保费', category: PiiCategory.BUSINESS, sensitivityLevel: PiiSensitivityLevel.LEVEL_2,
		keywordPatterns: ['保费', 'premium', 'premium_amount']
	}),
	createMockTerm({
		termId: '8', name: '保额', category: PiiCategory.BUSINESS, sensitivityLevel: PiiSensitivityLevel.LEVEL_2,
		keywordPatterns: ['保额', 'sum_insured', 'insured_amount']
	}),
	createMockTerm({
		termId: '9', name: '保单号', category: PiiCategory.BUSINESS, sensitivityLevel: PiiSensitivityLevel.LEVEL_2,
		keywordPatterns: ['保单号', 'policy_no', 'policy_number']
	}),
	createMockTerm({
		termId: '10', name: '账户金额', category: PiiCategory.CUSTOMER, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		keywordPatterns: ['账户余额', 'account_balance', 'balance', 'amount']
	}),
	createMockTerm({
		termId: '11', name: '银行卡号', category: PiiCategory.BUSINESS, sensitivityLevel: PiiSensitivityLevel.LEVEL_1,
		keywordPatterns: ['银行卡', 'bank_card', 'card_number']
	})
];

// latest discovery result per term, in-memory
const mockDiscoveries: Record<string, Array<PiiLinkedFactor>> = {};

const buildMockDiscoveryFactors = (): Array<PiiLinkedFactor> => {
	return [
		{topicId: '101', topicName: 'policy_raw', factorId: '1001', factorName: 'id_card_no', factorType: 'id-no', matchConfidence: 1.0, matchSource: PiiMatchSource.TYPE, confirmed: true},
		{topicId: '101', topicName: 'policy_raw', factorId: '1002', factorName: 'customer_name', matchConfidence: 0.9, matchSource: PiiMatchSource.KEYWORD, confirmed: true},
		{topicId: '102', topicName: 'customer_info', factorId: '1003', factorName: 'identity_number', factorType: 'id-no', matchConfidence: 1.0, matchSource: PiiMatchSource.TYPE, confirmed: true},
		{topicId: '102', topicName: 'customer_info', factorId: '1004', factorName: 'mobile_phone', factorType: 'mobile', matchConfidence: 1.0, matchSource: PiiMatchSource.TYPE, confirmed: true},
		{topicId: '102', topicName: 'customer_info', factorId: '1005', factorName: 'email_addr', factorType: 'email', matchConfidence: 1.0, matchSource: PiiMatchSource.TYPE, confirmed: true},
		{topicId: '102', topicName: 'customer_info', factorId: '1006', factorName: 'birth_date', factorType: 'date-of-birth', matchConfidence: 1.0, matchSource: PiiMatchSource.TYPE, confirmed: true},
		{topicId: '103', topicName: 'policy_summary', factorId: '1007', factorName: 'holder_name', matchConfidence: 0.87, matchSource: PiiMatchSource.AI, confirmed: false},
		{topicId: '104', topicName: 'address_book', factorId: '1008', factorName: 'contact_id', matchConfidence: 0.85, matchSource: PiiMatchSource.KEYWORD, confirmed: false}
	];
};

export const fetchMockPiiTerms = async (): Promise<Array<PiiClassificationTerm>> => {
	return delayed(mockTerms);
};

export const saveMockPiiTerm = async (term: PiiClassificationTerm): Promise<PiiClassificationTerm> => {
	if (term.termId && mockTerms.some(t => t.termId === term.termId)) {
		mockTerms = mockTerms.map(t => {
			if (t.termId !== term.termId) {
				return t;
			}
			return {...term, linkedFactors: t.linkedFactors, lastModifiedAt: now(), version: (t.version ?? 1) + 1};
		});
		return delayed(mockTerms.find(t => t.termId === term.termId)!);
	} else {
		const created: PiiClassificationTerm = {
			...term,
			termId: `${termIdSeq++}`,
			tenantId: '1',
			linkedFactors: [],
			createdAt: now(),
			lastModifiedAt: now(),
			version: 1
		};
		mockTerms = [...mockTerms, created];
		return delayed(created);
	}
};

export const deleteMockPiiTerm = async (termId: string): Promise<void> => {
	mockTerms = mockTerms.filter(t => t.termId !== termId);
	delete mockDiscoveries[termId];
	return delayed(void 0);
};

export const discoverMockPiiTerm = async (options: {
	termId: string;
	strategy?: PiiMatchStrategy | string;
}): Promise<PiiDiscoverResult> => {
	const {termId, strategy} = options;
	let factors = mockDiscoveries[termId];
	if (!factors) {
		factors = buildMockDiscoveryFactors();
		// keep previously confirmed links, like backend does
		const term = mockTerms.find(t => t.termId === termId);
		const confirmed = (term?.linkedFactors ?? []).filter(lf => lf.confirmed);
		factors = factors.map(lf => {
			return confirmed.some(c => c.topicId === lf.topicId && c.factorId === lf.factorId)
				? {...lf, confirmed: true} : lf;
		});
		mockDiscoveries[termId] = factors;
	}
	let filtered = factors;
	if (strategy === PiiMatchStrategy.LOGIC) {
		filtered = factors.filter(lf => lf.matchSource !== PiiMatchSource.AI);
	} else if (strategy === PiiMatchStrategy.AI) {
		filtered = factors.filter(lf => lf.matchSource === PiiMatchSource.AI);
	}
	return delayed({termId, linkedFactors: filtered, totalCount: filtered.length});
};

export const confirmMockPiiTerm = async (options: {
	termId: string;
	factorIds: Array<string>;
	removeFactorIds: Array<string>;
}): Promise<PiiClassificationTerm> => {
	const {termId, factorIds, removeFactorIds} = options;
	const discovered = mockDiscoveries[termId] ?? [];
	const surviving = discovered
		.filter(lf => !removeFactorIds.includes(lf.factorId))
		.map(lf => factorIds.includes(lf.factorId) || lf.confirmed ? {...lf, confirmed: true} : lf);
	mockDiscoveries[termId] = surviving;
	mockTerms = mockTerms.map(t => {
		if (t.termId !== termId) {
			return t;
		}
		// backend keeps confirmed links on the term itself
		return {...t, linkedFactors: surviving.filter(lf => lf.confirmed), lastModifiedAt: now()};
	});
	return delayed(mockTerms.find(t => t.termId === termId)!);
};

export const fetchMockPiiLineage = async (options: { termId: string }): Promise<PiiLineageReport> => {
	const term = mockTerms.find(t => t.termId === options.termId);
	return delayed({
		termId: options.termId,
		termName: term?.name,
		sensitivityLevel: term?.sensitivityLevel,
		linkedFactors: term?.linkedFactors ?? [],
		upstreamRoutes: [],
		downstreamRoutes: [],
		metrics: [{metricId: 'm1', metricName: 'metric_holder_count', topicId: '103'}],
		graphData: {
			nodes: [
				{id: 'topic:policy_raw', type: 'topic', name: 'policy_raw', sensitivity: PiiSensitivityLevel.LEVEL_1},
				{id: 'factor:id_card_no', type: 'topic_factor', name: 'id_card_no', sensitivity: PiiSensitivityLevel.LEVEL_1},
				{id: 'topic:customer_info', type: 'topic', name: 'customer_info', sensitivity: PiiSensitivityLevel.LEVEL_1},
				{id: 'factor:identity_number', type: 'topic_factor', name: 'identity_number', sensitivity: PiiSensitivityLevel.LEVEL_1},
				{id: 'pipeline:pipeline_etl_01', type: 'pipeline', name: 'pipeline_etl_01'},
				{id: 'topic:policy_summary', type: 'topic', name: 'policy_summary', sensitivity: PiiSensitivityLevel.LEVEL_2},
				{id: 'factor:holder_name', type: 'topic_factor', name: 'holder_name', sensitivity: PiiSensitivityLevel.LEVEL_2},
				{id: 'pipeline:pipeline_agg', type: 'pipeline', name: 'pipeline_agg'},
				{id: 'metric:metric_holder_count', type: 'metric', name: 'metric_holder_count'}
			],
			edges: [
				{from: 'topic:policy_raw', to: 'factor:id_card_no', kind: 'maps_to'},
				{from: 'pipeline:pipeline_etl_01', to: 'topic:policy_raw', kind: 'reads_from'},
				{from: 'pipeline:pipeline_etl_01', to: 'topic:customer_info', kind: 'reads_from'},
				{from: 'topic:customer_info', to: 'factor:identity_number', kind: 'maps_to'},
				{from: 'pipeline:pipeline_agg', to: 'topic:policy_summary', kind: 'produces'},
				{from: 'topic:policy_summary', to: 'factor:holder_name', kind: 'maps_to'},
				{from: 'topic:policy_summary', to: 'metric:metric_holder_count', kind: 'produces'}
			]
		},
		encryptionCoverage: {total: 15, encrypted: 8, plaintext: 7},
		maxUpstreamDepth: 2,
		maxDownstreamDepth: 3
	} as PiiLineageReport);
};

const buildMockOverviewRow = (options: {
	termId: string; termName: string; level: PiiSensitivityLevel; category: PiiCategory;
	factors: number; topics: number; pipelines: number; encryptedRate: number;
}): PiiTermOverview => {
	const encrypted = Math.round(options.factors * options.encryptedRate);
	return {
		termId: options.termId,
		termName: options.termName,
		sensitivityLevel: options.level,
		category: options.category,
		linkedFactorCount: options.factors,
		topicCount: options.topics,
		pipelineCount: options.pipelines,
		metricCount: 0,
		encryptedFactorCount: encrypted,
		plaintextFactorCount: options.factors - encrypted,
		maxUpstreamDepth: 2,
		maxDownstreamDepth: 3
	};
};

export const fetchMockPiiReport = async (): Promise<PiiGlobalDashboard> => {
	const terms: Array<PiiTermOverview> = [
		buildMockOverviewRow({termId: '1', termName: '证件号码', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 15, topics: 4, pipelines: 6, encryptedRate: 0.73}),
		buildMockOverviewRow({termId: '2', termName: '客户姓名', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 18, topics: 5, pipelines: 8, encryptedRate: 0.67}),
		buildMockOverviewRow({termId: '3', termName: '出生日期', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 8, topics: 3, pipelines: 2, encryptedRate: 0.88}),
		buildMockOverviewRow({termId: '4', termName: '手机号码', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 12, topics: 4, pipelines: 5, encryptedRate: 0.75}),
		buildMockOverviewRow({termId: '5', termName: '家庭住址', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 6, topics: 2, pipelines: 1, encryptedRate: 0.5}),
		buildMockOverviewRow({termId: '6', termName: '邮箱地址', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 9, topics: 3, pipelines: 2, encryptedRate: 0.78}),
		buildMockOverviewRow({termId: '7', termName: '保费', level: PiiSensitivityLevel.LEVEL_2, category: PiiCategory.BUSINESS, factors: 14, topics: 3, pipelines: 4, encryptedRate: 1}),
		buildMockOverviewRow({termId: '8', termName: '保额', level: PiiSensitivityLevel.LEVEL_2, category: PiiCategory.BUSINESS, factors: 7, topics: 2, pipelines: 2, encryptedRate: 1}),
		buildMockOverviewRow({termId: '9', termName: '保单号', level: PiiSensitivityLevel.LEVEL_2, category: PiiCategory.BUSINESS, factors: 5, topics: 2, pipelines: 1, encryptedRate: 1}),
		buildMockOverviewRow({termId: '10', termName: '账户金额', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.CUSTOMER, factors: 11, topics: 3, pipelines: 3, encryptedRate: 0.64}),
		buildMockOverviewRow({termId: '11', termName: '银行卡号', level: PiiSensitivityLevel.LEVEL_1, category: PiiCategory.BUSINESS, factors: 4, topics: 1, pipelines: 1, encryptedRate: 0.5})
	];
	return delayed({
		totalTerms: 11,
		bySensitivityLevel: {[PiiSensitivityLevel.LEVEL_1]: 87, [PiiSensitivityLevel.LEVEL_2]: 22},
		byCategory: {[PiiCategory.CUSTOMER]: 68, [PiiCategory.BUSINESS]: 41, [PiiCategory.OPERATION]: 0, [PiiCategory.REGULATORY]: 0},
		highRiskTerms: [terms[4], terms[10], terms[9], terms[0]],
		topImpactTerms: [terms[1], terms[0], terms[3]],
		terms
	});
};

export const buildMockPiiReportCsv = (dashboard: PiiGlobalDashboard): string => {
	const header = 'Term,Sensitivity Level,Category,Linked Factors,Topics,Pipelines,Encrypted,Plaintext';
	const rows = dashboard.terms.map(t => {
		return [t.termName, t.sensitivityLevel ?? '', t.category ?? '', t.linkedFactorCount, t.topicCount, t.pipelineCount, t.encryptedFactorCount, t.plaintextFactorCount].join(',');
	});
	return [header, ...rows].join('\n');
};
