import {
	MonitorRule,
	MonitorRuleGrade,
	MonitorRuleLog,
	MonitorRuleLogs,
	MonitorRuleOnFactor,
	MonitorRuleOnTopic,
	MonitorRuleStatisticalInterval,
	MonitorRules
} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs, fetchMonitorRules, isRuleOnFactor, isRuleOnTopic, runMonitorRules} from '@/services/data/data-quality/rules';
import {FactorId} from '@/services/data/tuples/factor-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Button} from '@/widgets/basic/button';
import {Calendar} from '@/widgets/basic/calendar';
import {ICON_LOADING, ICON_PLAY} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {DialogBody, DialogFooter, DialogHeader} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import dayjs, {Dayjs} from 'dayjs';
import React, {useState} from 'react';
import {useDataQualityCacheData} from '../cache/use-cache-data';
import {DQCCacheData} from '../cache/types';
import {RuleDefs} from '../rule-defs';
import {getTopicName} from '../utils';
import {
	RunDialogForm,
	RunDialogHint,
	RunDialogLabel,
	RunResultsBodyRow,
	RunResultsCell,
	RunResultsHeaderRow,
	RunResultsNoData,
	RunResultsTable
} from './run-rules-widgets';

const RESULT_DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss.SSS';

const FREQUENCY_OPTIONS = [
	{value: MonitorRuleStatisticalInterval.DAILY, label: 'Daily'},
	{value: MonitorRuleStatisticalInterval.WEEKLY, label: 'Weekly'},
	{value: MonitorRuleStatisticalInterval.MONTHLY, label: 'Monthly'}
];

/** Whether the log can be produced by the rule: code, topic and factor must all
 * agree; rules without topic/factor scope (global grade) match any topic/factor. */
const ruleMatchesLog = (rule: MonitorRule, log: MonitorRuleLog): boolean => {
	if (!rule.enabled || rule.code !== log.ruleCode) {
		return false;
	}
	let topicId: TopicId | undefined;
	let factorId: FactorId | undefined;
	if (isRuleOnFactor(rule)) {
		topicId = (rule as MonitorRuleOnFactor).topicId;
		factorId = (rule as MonitorRuleOnFactor).factorId;
	} else if (isRuleOnTopic(rule)) {
		topicId = (rule as MonitorRuleOnTopic).topicId;
	}
	return (!topicId || topicId === log.topicId) && (!factorId || factorId === log.factorId);
};

/** Enabled rules of the run scope: the selected topic, or every rule of the tenant. */
const loadEnabledRules = async (topic?: Topic, topics: Array<Topic> = []): Promise<MonitorRules> => {
	if (topic?.topicId) {
		return await fetchMonitorRules({criteria: {grade: MonitorRuleGrade.TOPIC, topicId: topic.topicId}});
	}
	const globalRules = await fetchMonitorRules({criteria: {grade: MonitorRuleGrade.GLOBAL}});
	const topicRules = await Promise.all(
		topics.filter(topicItem => !!topicItem.topicId).map(async topicItem => {
			try {
				return await fetchMonitorRules({criteria: {grade: MonitorRuleGrade.TOPIC, topicId: topicItem.topicId!}});
			} catch {
				return [];
			}
		})
	);
	return [...globalRules, ...topicRules.flat()];
};

/** Mirrors the backend shift: a run dated today/this week/this month is moved to
 * the previous day/week/month, and rule-hit logs are stamped with that date. */
const computeEffectiveProcessDate = (frequency: MonitorRuleStatisticalInterval, given?: Dayjs): Dayjs => {
	const base = given ?? dayjs();
	const now = dayjs();
	if (frequency === MonitorRuleStatisticalInterval.MONTHLY) {
		return base.isSame(now, 'month') ? base.subtract(1, 'month') : base;
	} else if (frequency === MonitorRuleStatisticalInterval.WEEKLY) {
		return base.isSame(now, 'week') ? base.subtract(7, 'day') : base;
	} else {
		return base.isSame(now, 'date') ? base.subtract(1, 'day') : base;
	}
};

const RunResultsDialog = (props: {
	logs: MonitorRuleLogs;
	topics: Array<Topic>;
	effectiveDate: Dayjs;
	frequency: MonitorRuleStatisticalInterval;
	topic?: Topic;
}) => {
	const {logs, topics, effectiveDate, frequency, topic} = props;
	const {fire: fireGlobal} = useEventBus();

	const topicMap = topics.reduce((map, item) => {
		if (item.topicId) {
			map[item.topicId] = item;
		}
		return map;
	}, {} as Record<string, Topic>);
	const format = new Intl.NumberFormat(undefined, {useGrouping: true});

	return <>
		<DialogHeader>
			<span>Run Results - {frequency} @ {effectiveDate.format('YYYY-MM-DD')}
				{topic ? ` - ${getTopicName(topic)}` : ''}</span>
		</DialogHeader>
		<DialogBody>
			<RunResultsTable>
				<RunResultsHeaderRow>
					<RunResultsCell>#</RunResultsCell>
					<RunResultsCell>Rule</RunResultsCell>
					<RunResultsCell>Topic</RunResultsCell>
					<RunResultsCell>Factor</RunResultsCell>
					<RunResultsCell data-role="count">Occurred Times</RunResultsCell>
					<RunResultsCell>Last Occurred</RunResultsCell>
				</RunResultsHeaderRow>
				{logs.length === 0
					? <RunResultsNoData>No rule hit on this process date. All configured rules passed.</RunResultsNoData>
					: logs.map((log, index) => {
						const ruleTopic = log.topicId ? topicMap[log.topicId] : (void 0);
						const topicName = ruleTopic ? getTopicName(ruleTopic) : (log.topicId || '');
						const factorName = log.factorId
							? ((ruleTopic?.factors || []).find(factor => factor.factorId === log.factorId)?.name || 'Noname Factor')
							: '';
						return <RunResultsBodyRow key={index}>
							<RunResultsCell>{index + 1}</RunResultsCell>
							<RunResultsCell>{RuleDefs[log.ruleCode]?.name || log.ruleCode}</RunResultsCell>
							<RunResultsCell>{topicName}</RunResultsCell>
							<RunResultsCell>{factorName}</RunResultsCell>
							<RunResultsCell data-role="count">{format.format(log.count)}</RunResultsCell>
							<RunResultsCell>{log.lastOccurredTime}</RunResultsCell>
						</RunResultsBodyRow>;
					})}
			</RunResultsTable>
		</DialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={() => fireGlobal(EventTypes.HIDE_DIALOG)}>
				<span>Close</span>
			</Button>
		</DialogFooter>
	</>;
};

const RunRulesDialog = (props: { topics: Array<Topic> }) => {
	const {topics} = props;
	const {fire: fireGlobal} = useEventBus();

	const [topic, setTopic] = useState<Topic | ''>('');
	const [frequency, setFrequency] = useState<MonitorRuleStatisticalInterval>(MonitorRuleStatisticalInterval.DAILY);
	const [processDate, setProcessDate] = useState<string>('');
	const [running, setRunning] = useState(false);

	const topicOptions = [
		{value: '', label: 'Any Topic'},
		...topics.filter(topicItem => !!topicItem.topicId).map(topicItem => {
			return {value: topicItem.topicId!, label: getTopicName(topicItem)};
		}).sort((o1, o2) => o1.label.toLowerCase().localeCompare(o2.label.toLowerCase()))
	];

	const onTopicChanged = (option: DropdownOption) => {
		// eslint-disable-next-line
		setTopic(topics.find(topicItem => topicItem.topicId == option.value) ?? '');
	};
	const onFrequencyChanged = (option: DropdownOption) => setFrequency(option.value as MonitorRuleStatisticalInterval);
	const onProcessDateChanged = (value?: string) => setProcessDate(value || '');

	const onCancelClicked = () => fireGlobal(EventTypes.HIDE_DIALOG);

	const onRunClicked = () => {
		if (running) {
			return;
		}
		setRunning(true);
		// topic name (not id) is what the backend resolves
		const selectedTopic = topic !== '' && !!topic.name ? topic : (void 0);
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await runMonitorRules({
				topicName: selectedTopic?.name,
				frequency,
				processDate: processDate ? dayjs(processDate).format('YYYY-MM-DD') : (void 0)
			}),
			() => {
				setRunning(false);
				fireGlobal(EventTypes.HIDE_DIALOG);

				// logs are stamped with the backend-resolved process date
				const effectiveDate = computeEffectiveProcessDate(
					frequency, processDate ? dayjs(processDate) : (void 0));
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => {
						const [logs, scopeRules] = await Promise.all([
							fetchMonitorRuleLogs({
								criteria: {
									startDate: effectiveDate.startOf('date').format(RESULT_DATE_FORMAT),
									endDate: effectiveDate.endOf('date').format(RESULT_DATE_FORMAT),
									topicId: selectedTopic?.topicId
								}
							}),
							loadEnabledRules(selectedTopic, topics)
						]);
						// only enabled rules are executed by the run, drop stale logs
						// written by earlier runs (e.g. the scheduled job) of other rules
						return (logs || []).filter(log => scopeRules.some(rule => ruleMatchesLog(rule, log)));
					},
					(logs: MonitorRuleLogs) => {
						fireGlobal(EventTypes.SHOW_DIALOG,
							<RunResultsDialog logs={logs || []} topics={topics}
							                  effectiveDate={effectiveDate} frequency={frequency}
							                  topic={selectedTopic}/>,
							// the default dialog is 500px wide, too small for the results table
							{width: '80vw', marginLeft: '10vw', marginTop: '8vh'});
					});
			});
	};

	return <>
		<DialogHeader><span>Run Monitor Rules</span></DialogHeader>
		<DialogBody>
			<RunDialogForm>
				<RunDialogLabel>Topic</RunDialogLabel>
				<Dropdown value={topic === '' ? '' : topic.topicId} options={topicOptions} onChange={onTopicChanged}/>
				<RunDialogLabel>Frequency</RunDialogLabel>
				<Dropdown value={frequency} options={FREQUENCY_OPTIONS} onChange={onFrequencyChanged}/>
				<RunDialogLabel>Process Date</RunDialogLabel>
				<Calendar value={processDate} showTime={false} onChange={onProcessDateChanged}/>
				<RunDialogHint>
					Runs configured rules immediately, only enabled rules are executed and shown in results. A daily run
					dated today processes yesterday's data, and so does a weekly/monthly run dated within the current
					week/month. Results (rule hits) show up after the run finishes.
				</RunDialogHint>
			</RunDialogForm>
		</DialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>
				<span>Cancel</span>
			</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onRunClicked}>
				<FontAwesomeIcon icon={running ? ICON_LOADING : ICON_PLAY} spin={running}/>
				<span>{running ? 'Running...' : 'Run'}</span>
			</Button>
		</DialogFooter>
	</>;
};

export const RunRulesButton = () => {
	const {fire: fireGlobal} = useEventBus();
	const [topics, setTopics] = useState<Array<Topic>>([]);
	const [onDataRetrieved] = useState(() => {
		return (data?: DQCCacheData) => {
			if (data) {
				setTopics(data.topics);
			}
		};
	});
	useDataQualityCacheData({onDataRetrieved});

	const onRunClicked = () => {
		fireGlobal(EventTypes.SHOW_DIALOG, <RunRulesDialog topics={topics}/>);
	};

	return <Button ink={ButtonInk.PRIMARY} onClick={onRunClicked}>
		<FontAwesomeIcon icon={ICON_PLAY}/>
		<span>Run Rules</span>
	</Button>;
};
