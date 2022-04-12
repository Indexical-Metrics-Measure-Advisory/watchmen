import {findToken} from './account';
import {doFetch, getServiceHost} from './utils';

export const Apis = {
	LOGIN: 'login',

	// admin only
	// update date apis
	PIPELINE_UPDATED: 'pipeline/updated',
	PIPELINE_GRAPHICS_MINE_UPDATED: 'pipeline/graphics/updated',
	TOPIC_UPDATED: 'topic/updated',

	PIPELINE_ALL: 'pipeline/all',
	PIPELINE_GRAPHICS_MINE: 'pipeline/graphics',
	PIPELINE_GRAPHICS_SAVE: 'pipeline/graphics',
	PIPELINE_GRAPHICS_DELETE: 'pipeline/graphics/delete?pipeline_graph_id=:pipelineGraphId',
	PIPELINE_GET: 'pipeline?pipeline_id=:pipelineId',
	PIPELINE_CREATE: 'pipeline',
	PIPELINE_SAVE: 'pipeline',
	PIPELINE_RENAME: 'pipeline/rename?pipeline_id=:pipelineId&name=:name',
	PIPELINE_ENABLE: 'pipeline/enabled?pipeline_id=:pipelineId&enabled=:enabled',

	SPACE_LIST_BY_NAME: 'space/name?query_name=:search',
	SPACE_LIST_FOR_HOLDER_BY_NAME: 'space/list/name?query_name=:search',
	SPACE_BY_IDS: 'space/ids',
	SPACE_GET: 'space?space_id=:spaceId',
	SPACE_CREATE: 'space',
	SPACE_SAVE: 'space',
	SPACES_EXPORT: 'space/export',

	TOPIC_ALL: 'topic/all',
	TOPIC_LIST_BY_NAME: 'topic/name?query_name=:search',
	// TOPIC_LIST_FOR_HOLDER_BY_NAME: 'topic/list/name?query_name=:search',
	TOPIC_LIST_FOR_HOLDER_BY_NAME_NON_RAW: 'topic/list/name?query_name=:search&exclude_types=raw',
	TOPIC_GET: 'topic?topic_id=:topicId',
	TOPIC_CREATE: 'topic',
	TOPIC_SAVE: 'topic',
	TOPIC_PROFILE: 'dqc/topic/profile?topic_id=:topicId&date=:date',

	ENUM_LIST_BY_NAME: 'enum/name?query_name=:search',
	ENUM_GET: 'enum?enum_id=:enumId',
	ENUM_CREATE: 'enum',
	ENUM_SAVE: 'enum',
	ENUM_LOAD_ALL: 'enum/all',
	ENUM_ITEMS_IMPORT: 'enum/items/import',

	REPORT_LIST_BY_NAME: 'report/name?query_name=:search',

	USER_LIST_BY_NAME: 'user/name?query_name=:search',
	USER_LIST_FOR_HOLDER_BY_NAME: 'user/list/name?query_name=:search',
	USER_BY_IDS: 'user/ids',
	USER_GET: 'user?user_id=:userId',
	USER_CREATE: 'user',
	USER_SAVE: 'user',

	TENANT_LIST_BY_NAME: 'tenant/name?query_name=:search',
	TENANT_GET: 'tenant?tenant_id=:tenantId',
	TENANT_CREATE: 'tenant',
	TENANT_SAVE: 'tenant',

	USER_GROUP_LIST_BY_NAME: 'user_group/name?query_name=:search',
	USER_GROUP_LIST_FOR_HOLDER_BY_NAME: 'user_group/list/name?query_name=:search',
	USER_GROUP_BY_IDS: 'user_group/ids',
	USER_GROUP_GET: 'user_group?user_group_id=:userGroupId',
	USER_GROUP_CREATE: 'user_group',
	USER_GROUP_SAVE: 'user_group',

	DATASOURCE_LIST_BY_NAME: 'datasource/name?query_name=:search',
	DATASOURCE_GET: 'datasource?data_source_id=:dataSourceId',
	DATASOURCE_CREATE: 'datasource',
	DATASOURCE_SAVE: 'datasource',
	DATASOURCE_LOAD_ALL: 'datasource/all',

	EXTERNAL_WRITER_LIST_BY_NAME: 'external_writer/name?query_name=:search',
	EXTERNAL_WRITER_GET: 'external_writer?writer_id=:writerId',
	EXTERNAL_WRITER_CREATE: 'external_writer',
	EXTERNAL_WRITER_SAVE: 'external_writer',
	EXTERNAL_WRITER_LOAD_ALL: 'external_writer/all',

	DASHBOARD_FOR_ADMIN: 'dashboard/admin',

	// authenticated
	SPACES_AVAILABLE: 'space/available',
	SPACE_CONNECT: 'connected_space/connect?space_id=:spaceId&name=:name&template_ids=:templateIds',

	TOPICS_BY_IDS: 'topic/ids',

	CONNECTED_SPACES_MINE: 'connected_space/list',
	CONNECTED_SPACES_GRAPHICS_MINE: 'connected_space/graphics',
	CONNECTED_SPACE_AS_TEMPLATE: 'connected_space/template?connect_id=:connectId&is_template=:template',
	CONNECTED_SPACE_RENAME: 'connected_space/rename?connect_id=:connectId&name=:name',
	CONNECTED_SPACE_DELETE: 'connected_space/delete?connect_id=:connectId',
	CONNECTED_SPACE_GRAPHICS_SAVE: 'connected_space/graphics',
	CONNECTED_SPACES_TEMPLATE_LIST: 'connected_space/template/list?space_id=:spaceId',
	CONNECTED_SPACES_EXPORT: 'connected_space/export',

	SUBJECT_CREATE: 'subject',
	SUBJECT_SAVE: 'subject',
	SUBJECT_RENAME: 'subject/rename?subject_id=:subjectId&name=:name',
	SUBJECT_DELETE: 'subject/delete?subject_id=:subjectId',
	/**
	 * Subject share is deprecated and removed from frontend implementation, not supported anymore
	 */
	// SUBJECT_SHARE: 'subject/share',
	SUBJECT_DATA: 'subject/data?subject_id=:subjectId',

	REPORT_CREATE: 'report',
	REPORT_SAVE: 'report',
	REPORT_DELETE: 'report/delete?report_id=:reportId',
	REPORT_TEMPORARY: 'report/temporary',
	REPORT_DATA: 'report/data?report_id=:reportId',

	/** TODO api to retrieve dashboard share url from server side, not implemented yet */
	// DASHBOARD_SHARE: 'dashboard/share',
	DASHBOARD_MINE: 'dashboard/list',
	DASHBOARD_CREATE: 'dashboard',
	DASHBOARD_SAVE: 'dashboard',
	DASHBOARD_RENAME: 'dashboard/rename?dashboard_id=:dashboardId&name=:name',
	DASHBOARD_DELETE: 'dashboard/delete?dashboard_id=:dashboardId',

	FAVORITE_MINE: 'favorite',
	FAVORITE_SAVE: 'favorite',

	LAST_SNAPSHOT_MINE: 'last_snapshot',
	LAST_SNAPSHOT_SAVE: 'last_snapshot',

	PAT_LIST: 'pat/list',
	PAT_CREATE: 'pat/create',
	PAT_DELETE: 'pat/delete?pat_id=:patId',

	// any
	// SUBJECT_SHARE_GET: 'share/subject?subject_id=:subjectId&&token=:token',
	DASHBOARD_SHARE_GET: 'dashboard/shared?dashboard_id=:dashboardId&token=:token',

	QUERY_LOG: 'pipeline/log',
	QUERY_RULE: 'dqc/monitor/rules?grade=:grade&topic_id=:topicId',
	QUERY_RULE_RESULT: 'dqc/monitor/result',
	SAVE_RULE_LIST: 'dqc/monitor/rules',
	IMPORT_TOPICS_AND_PIPELINES: 'import',

	QUERY_CATALOG: 'dqc/catalog/criteria',
	CATALOG_CREATE: 'dqc/catalog',
	CATALOG_SAVE: 'dqc/catalog',
	CATALOG_DELETE: 'dqc/catalog/delete?catalog_id=:catalogId',

	// indicator workbench
	INDICATOR_LIST_BY_NAME: 'indicator/indicator/name?query_name=:search',
	INDICATOR_LIST_FOR_SELECTION: 'indicator/indicator/name?query_name=:search',
	TOPIC_LIST_FOR_INDICATOR_SELECTION: 'topic/index/name?query_name=:search',
	ENUM_LIST_FOR_INDICATOR_TOPIC: 'enum/list/topic?topic_id=:topicId',
	INDICATOR_GET: 'indicator/indicator?indicator_id=:indicatorId',
	INDICATOR_CREATE: 'indicator/indicator',
	INDICATOR_SAVE: 'indicator/indicator',
	RELEVANT_INDICATOR_LIST: 'indicator/indicator/relevant?indicator_id=:indicatorId',
	INDICATOR_CATEGORIES: 'indicator/indicator/category/available',
	INDICATORS_LIST: 'indicator/indicator/all',

	BUCKET_LIST_BY_NAME: 'indicator/bucket/name?query_name=:search',
	BUCKET_CREATE: 'indicator/bucket',
	BUCKET_SAVE: 'indicator/bucket',
	BUCKET_GET: 'indicator/bucket?bucket_id=:bucketId',
	BUCKET_LIST_FOR_INDICATOR_VALUE: 'indicator/bucket/numeric-value?query_name=:search',
	/** bucketIds is joined by comma */
	BUCKET_LIST_BY_IDS: 'indicator/bucket/ids',
	BUCKET_LIST_BY_METHODS: 'indicator/bucket/methods',

	INSPECTION_LIST: 'indicator/inspection/list',
	INSPECTION_CREATE: 'indicator/inspection',
	INSPECTION_GET: 'indicator/inspection?inspection_id=:inspectionId',
	INSPECTION_SAVE: 'indicator/inspection',
	INSPECTION_DATA: 'indicator/inspection/data?inspection_id=:inspectionId',

	NAVIGATION_LIST_BY_NAME: 'indicator/navigation/name?query_name=:search',
	NAVIGATION_CREATE: 'indicator/navigation',
	NAVIGATION_SAVE: 'indicator/navigation',
	NAVIGATION_GET: 'indicator/navigation?navigation_id=:navigationId',
	NAVIGATION_INDICATOR_DATA: 'indicator/navigation/data'
};

const buildApi = (api: string, args?: Record<string, any>): string => {
	if (!args) {
		return api;
	}

	return Object.keys(args).reduce((api: string, key: string) => {
		const value = args[key] ?? '';
		return api.replace(`:${key}`, encodeURIComponent(value));
	}, api);
};

const request = async (options: {
	api: string;
	method: 'POST' | 'GET';
	search?: Record<string, any>;
	auth?: boolean;
	pageable?: { pageNumber: number; pageSize: number };
	data?: any;
}) => {
	const {api, method = 'GET', search, auth = true, pageable, data} = options;

	const url = `${getServiceHost()}${buildApi(api, search)}`;

	const headers: HeadersInit = {
		'Content-Type': 'application/json'
	};
	if (auth) {
		headers.Authorization = `Bearer ${findToken()}`;
	}

	let body;
	if (pageable) {
		body = JSON.stringify(pageable);
	} else if (data) {
		body = JSON.stringify(data);
	}

	const response = await doFetch(url, {method, headers, body});
	try {
		return await response.json();
	} catch {
		return null;
	}
};

export const get = async (options: { api: string; search?: Record<string, any>; auth?: boolean }) => {
	const {api, search, auth} = options;
	return await request({api, method: 'GET', search, auth});
};

export const post = async (options: { api: string; search?: Record<string, any>; auth?: boolean; data?: any }) => {
	const {api, search, auth, data} = options;
	return await request({api, method: 'POST', search, auth, data});
};

export const page = async (options: {
	api: string;
	search?: Record<string, any>;
	auth?: boolean;
	pageable?: { pageNumber: number; pageSize: number };
}) => {
	const {api, search, auth, pageable} = options;
	return await request({api, method: 'POST', search, auth, pageable});
};
