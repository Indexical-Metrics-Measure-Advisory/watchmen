import {Apis, get, post} from '../apis';
import {fetchMockMonitorRuleLogs, fetchMockRules} from '../mock/data-quality/mock-rules';
import {isMockService} from '../utils';
import {
	MonitorRule,
	MonitorRuleLogCriteria,
	MonitorRuleLogs,
	MonitorRuleOnFactor,
	MonitorRuleOnTopic,
	MonitorRules,
	MonitorRulesCriteria,
	MonitorRuleStatisticalInterval
} from './rule-types';

export const fetchMonitorRules = async (options: { criteria: MonitorRulesCriteria }): Promise<MonitorRules> => {
	if (isMockService()) {
		return await fetchMockRules(options);
	} else {
		return get({
			api: Apis.QUERY_RULE,
			search: {grade: options.criteria.grade, topicId: options.criteria.topicId}
		});
	}
};

export const saveMonitorRules = async (options: { rules: MonitorRules }): Promise<MonitorRules> => {
	const {rules} = options;
	if (isMockService()) {
		return new Promise<MonitorRules>((resolve) => {
			setTimeout(() => resolve(rules || []), 1000);
		});
	} else {
		return post({
			api: Apis.SAVE_RULE_LIST,
			data: rules
		});
	}
};

/**
 * Trigger monitor rules run immediately. The backend runs synchronously and
 * returns no body; rule-hit logs are written for the (backend-resolved) process
 * date, to be queried via fetchMonitorRuleLogs.
 * Corresponds to: GET /dqc/monitor/rules/run?topic_name=&frequency=&process_date=
 */
export const runMonitorRules = async (options: {
	topicName?: string;
	frequency?: MonitorRuleStatisticalInterval;
	processDate?: string;
}): Promise<void> => {
	if (isMockService()) {
		return new Promise<void>((resolve) => {
			setTimeout(resolve, 1000);
		});
	} else {
		const search = new URLSearchParams();
		if (options.topicName) {
			search.set('topic_name', options.topicName);
		}
		if (options.frequency) {
			search.set('frequency', options.frequency);
		}
		if (options.processDate) {
			search.set('process_date', options.processDate);
		}
		const qs = search.toString();
		return get({api: qs ? `${Apis.RUN_RULES}?${qs}` : Apis.RUN_RULES});
	}
};

export const fetchMonitorRuleLogs = async (options: { criteria: MonitorRuleLogCriteria }): Promise<MonitorRuleLogs> => {
	// console.log(options.criteria)
	if (isMockService()) {
		return await fetchMockMonitorRuleLogs(options);
	} else {
		return post({
			api: Apis.QUERY_RULE_RESULT,
			data: options
		});
	}
};

export const isRuleOnTopic = (rule: MonitorRule): rule is MonitorRuleOnTopic => {
	const x = rule as any;
	return x.topicId && !x.factorId;
};
export const isRuleOnFactor = (rule: MonitorRule): rule is MonitorRuleOnFactor => {
	return (rule as any).factorId;
};
