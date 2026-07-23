// Monitor result (rule hit logs) service.
// Source router: packages/watchmen-rest-dqc/.../monitor/topic_monitor_router.py
// (POST /dqc/monitor/result).
import { API_BASE_URL, checkResponse, getDefaultHeaders, omitNil } from '@/utils/apiConfig';
import type { MonitorRuleLog, MonitorRuleLogCriteria } from '@/models/monitorResult';

class MonitorResultService {
	/**
	 * Query aggregated rule-hit logs by criteria.
	 * Corresponds to: POST /dqc/monitor/result
	 */
	async findLogs(criteria: MonitorRuleLogCriteria): Promise<MonitorRuleLog[]> {
		const res = await fetch(`${API_BASE_URL}/dqc/monitor/result`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(omitNil(criteria as Record<string, any>)),
		});
		return checkResponse(res);
	}
}

export const monitorResultService = new MonitorResultService();
export default monitorResultService;
