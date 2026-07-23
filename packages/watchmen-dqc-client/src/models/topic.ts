// Topic/factor models — mirror watchmen-model admin/topic.py + factor.py (subset),
// same as packages/watchmen-monitor-client/src/models/topic.models.ts.
// The DQC backend (watchmen-rest-dqc) exposes no topic-list endpoint; topic and
// factor pickers are served by the doll admin topic router
// (packages/watchmen-rest-doll/.../admin/topic_router.py: GET /topic/all, GET /topic?topic_id=).

/** `TopicKind` enum. */
export enum TopicKind {
	SYSTEM = 'system',
	BUSINESS = 'business',
	SYNONYM = 'synonym',
}

/** `TopicType` enum. */
export enum TopicType {
	RAW = 'raw',
	META = 'meta',
	DISTINCT = 'distinct',
	AGGREGATE = 'aggregate',
	TIME = 'time',
	RATIO = 'ratio',
}

/** `FactorType` — large enum; modeled as a string union with common values. */
export type FactorType =
	| 'SEQUENCE' | 'NUMBER' | 'UNSIGNED' | 'TEXT' | 'BOOLEAN' | 'ENUM'
	| 'DATETIME' | 'DATE' | 'TIME' | 'YEAR' | 'QUARTER' | 'MONTH' | 'HOUR'
	| 'OBJECT' | 'ARRAY'
	| 'CONTINENT' | 'COUNTRY' | 'PROVINCE' | 'CITY' | 'DISTRICT' | 'RESIDENTIAL_AREA'
	| 'EMAIL' | 'PHONE' | 'MOBILE' | 'GENDER' | 'OCCUPATION' | 'AGE' | 'ID_NO'
	| (string & {}); // allow arbitrary backend values

export interface Factor {
	factorId?: string;
	type?: FactorType;
	name?: string;
	enumId?: string;
	label?: string;
	description?: string;
	defaultValue?: any;
	flatten?: boolean;
	indexGroup?: string;
	encrypt?: string;
	precision?: number;
}

export interface Topic {
	topicId?: string;
	name?: string;
	type?: TopicType;
	kind?: TopicKind;
	dataSourceId?: string;
	factors?: Factor[];
	description?: string;
	tenantId?: string;
	version?: number;
	lastModifiedAt?: string;
	lastModifiedBy?: string;
	createdAt?: string;
	createdBy?: string;
}
