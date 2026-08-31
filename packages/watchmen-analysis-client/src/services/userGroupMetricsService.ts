import { MetricOption, UserGroupSummary } from '@/model/userGroupMetrics';
import { API_BASE_URL, WATCHMEN_API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

// user groups live in the main watchmen rest app (rest-doll)
export const fetchUserGroups = async (search = ''): Promise<UserGroupSummary[]> => {
	const response = await fetch(
		`${WATCHMEN_API_BASE_URL}/user_group/list/name?query_name=${encodeURIComponent(search)}`,
		{ headers: getDefaultHeaders() }
	);
	return checkResponse(response);
};

export const saveUserGroupMetrics = async (
	userGroupId: string,
	metricIds: string[]
): Promise<UserGroupSummary> => {
	const response = await fetch(
		`${API_BASE_URL}/metricflow/user_group/metrics?user_group_id=${encodeURIComponent(userGroupId)}`,
		{ method: 'POST', headers: getDefaultHeaders(), body: JSON.stringify(metricIds) }
	);
	return checkResponse(response);
};

// metrics live in the metricflow app
export const fetchMetrics = async (): Promise<MetricOption[]> => {
	const response = await fetch(`${API_BASE_URL}/metricflow/metrics/all`, {
		headers: getDefaultHeaders()
	});
	return checkResponse(response);
};

export const fetchMetricsByIds = async (metricIds: string[]): Promise<MetricOption[]> => {
	if (metricIds.length === 0) {
		return [];
	}
	const response = await fetch(`${API_BASE_URL}/metricflow/metrics/ids`, {
		method: 'POST',
		headers: getDefaultHeaders(),
		body: JSON.stringify(metricIds)
	});
	return checkResponse(response);
};
