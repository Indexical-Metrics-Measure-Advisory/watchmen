// Monitor rule service.
// Source router: packages/watchmen-rest-dqc/.../admin/monitor_rules_router.py
// (GET/POST /dqc/monitor/rules) and monitor/topic_monitor_router.py
// (GET /dqc/monitor/rules/run).
import { API_BASE_URL, checkResponse, getDefaultHeaders, omitNil } from '@/utils/apiConfig';
import type { MonitorRule, MonitorRuleGrade, MonitorRuleStatisticalInterval } from '@/models/monitorRule';

class MonitorRuleService {
	/**
	 * Load rules by grade and/or topic.
	 * Corresponds to: GET /dqc/monitor/rules?grade=&topic_id=
	 * Backend requires topic_id unless grade is global; global forbids topic_id.
	 */
	async findRules(grade?: MonitorRuleGrade, topicId?: string): Promise<MonitorRule[]> {
		const qs = new URLSearchParams();
		if (grade) qs.set('grade', grade);
		if (topicId) qs.set('topic_id', topicId);
		const res = await fetch(`${API_BASE_URL}/dqc/monitor/rules?${qs.toString()}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		return checkResponse(res);
	}

	/**
	 * Batch upsert rules; rules absent from the payload are deleted backend-side
	 * (delete_others_by_ids), so always post the full list for the tenant.
	 * Corresponds to: POST /dqc/monitor/rules
	 */
	async saveRules(rules: MonitorRule[]): Promise<MonitorRule[]> {
		const res = await fetch(`${API_BASE_URL}/dqc/monitor/rules`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(rules.map((rule) => omitNil(rule as Record<string, any>))),
		});
		return checkResponse(res);
	}

	/**
	 * Trigger a rules run immediately.
	 * Corresponds to: GET /dqc/monitor/rules/run?topic_name=&frequency=&process_date=
	 */
	async runRules(params: {
		topicName?: string;
		frequency?: MonitorRuleStatisticalInterval;
		processDate?: string;
	}): Promise<void> {
		const qs = new URLSearchParams();
		if (params.topicName) qs.set('topic_name', params.topicName);
		if (params.frequency) qs.set('frequency', params.frequency);
		if (params.processDate) qs.set('process_date', params.processDate);
		const res = await fetch(`${API_BASE_URL}/dqc/monitor/rules/run?${qs.toString()}`, {
			method: 'GET',
			headers: getDefaultHeaders(),
		});
		await checkResponse(res);
	}
}

export const monitorRuleService = new MonitorRuleService();
export default monitorRuleService;
