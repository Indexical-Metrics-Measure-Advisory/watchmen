import {MonitorRuleLogs, MonitorRules} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs, isRuleOnFactor, isRuleOnTopic} from '@/services/data/data-quality/rules';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import dayjs from 'dayjs';
import React, {useEffect, useMemo, useState} from 'react';
import {KpiCard, KpiRow} from '../widgets/kpi';

const DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss.SSS';
const WINDOW_DAYS = 30;

/**
 * Overview band of the monitor rules page: enablement summary of the currently
 * loaded rules plus the alert (rule-hit) count of the last 30 days.
 * Rule counters show '-' until a search has loaded rules.
 */
export const RulesOverview = (props: { rules: MonitorRules; loaded: boolean }) => {
	const {rules, loaded} = props;

	const {fire: fireGlobal} = useEventBus();
	const [logs, setLogs] = useState<MonitorRuleLogs | null>(null);

	const window30d = useMemo(() => {
		const now = dayjs();
		return {
			start: now.subtract(WINDOW_DAYS - 1, 'day').startOf('date').format(DATE_FORMAT),
			end: now.endOf('date').format(DATE_FORMAT)
		};
	}, []);

	// rule-hit logs of the last 30 days
	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchMonitorRuleLogs({criteria: {startDate: window30d.start, endDate: window30d.end}}),
			(loaded: MonitorRuleLogs) => setLogs(loaded || []));
	}, [fireGlobal, window30d]);

	const enabled = useMemo(() => rules.filter(rule => rule.enabled), [rules]);
	const globalEnabled = enabled.filter(rule => !isRuleOnTopic(rule) && !isRuleOnFactor(rule)).length;
	const topicEnabled = enabled.filter(rule => isRuleOnTopic(rule)).length;
	const factorEnabled = enabled.filter(rule => isRuleOnFactor(rule)).length;
	const alertCount = logs === null ? null : logs.filter(log => log.count > 0).length;

	return <KpiRow>
		<KpiCard label="Enabled Rules" value={loaded ? enabled.length : '-'}
		         subtext={loaded ? `${rules.length} loaded in total` : 'Load rules to see details'}/>
		<KpiCard label="Global Rules" value={loaded ? globalEnabled : '-'}
		         subtext="Enabled global rules"/>
		<KpiCard label="Topic / Factor Rules" value={loaded ? topicEnabled + factorEnabled : '-'}
		         subtext={loaded ? `${topicEnabled} topic · ${factorEnabled} factor` : (void 0)}/>
		<KpiCard label="Alerts (30d)" value={alertCount ?? '-'}
		         danger={(alertCount ?? 0) > 0}
		         subtext="Rule hits within last 30 days"/>
	</KpiRow>;
};
