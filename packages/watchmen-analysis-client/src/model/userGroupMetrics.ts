export type UserGroupId = string;

// user group tuple returned by the rest-doll admin api (`/user_group/list/name`)
export interface UserGroupSummary {
	userGroupId: UserGroupId;
	name: string;
	description?: string;
	metricIds?: string[];
}

// metric returned by the metricflow api (`/metricflow/metrics/all`, `/metricflow/metrics/ids`)
export interface MetricOption {
	id?: string;
	name: string;
	label?: string;
	type?: string;
	publishStatus?: string;
}
