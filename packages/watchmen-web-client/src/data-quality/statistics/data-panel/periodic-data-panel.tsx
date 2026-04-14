import {MonitorRuleCode, MonitorRuleLog, MonitorRuleLogs} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs} from '@/services/data/data-quality/rules';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {ICON_BACK, ICON_REFRESH} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useDataQualityCacheEventBus} from '../../cache/cache-event-bus';
import {DataQualityCacheEventTypes} from '../../cache/cache-event-bus-types';
import {DQCCacheData} from '../../cache/types';
import {RuleDefs} from '../../rule-defs';
import {getTopicName} from '../../utils';
import {DEFAULT_LAYOUTS} from '../constants';
import {StatsChart} from '../chart';
import {DataPanels} from '../types';
import {AdditionalDataPanelHeaderButton, DataPanel} from './index';
import {useLayout} from './use-layout';
import {
	DataPanelBody,
	DataPanelBodyBreakdownCell,
	DataPanelBodyDataCell,
	DataPanelBodyDataRow,
	DataPanelBodyDataSeqCell,
	DataPanelBodyHeader,
	DataPanelBodyHeaderCell,
	DataPanelBodyHeaderSeqCell,
	DataPanelBodyNoDataCell,
	HorizontalValue,
	HorizontalValueBar
} from './widgets';

const GRID_COLUMN_ALL = '35% 1fr 150px';

interface State {
	ruleCode?: MonitorRuleCode;
	topicId?: TopicId;
}

interface DataRow extends MonitorRuleLog {
	topicName?: string;
	factorName?: string;
}

export const PeriodicPanel = (props: {
	which: DataPanels;
	title: string;
	period: {
		start: () => string;
		end: () => string;
	}
}) => {
	const {which, title: givenTitle, period: {start, end}} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useDataQualityCacheEventBus();
	const {layout} = useLayout(which);

	const [title, setTitle] = useState(givenTitle);
	const [state, setState] = useState<State>({});
	const [data, setData] = useState<Array<DataRow>>([]);
	const [loading, setLoading] = useState(false);

	const loadData = useCallback((ruleCode?: MonitorRuleCode, topicId?: TopicId) => {
		setLoading(true);
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchMonitorRuleLogs({
				criteria: {
					startDate: start(),
					endDate: end(),
					ruleCode,
					topicId
				}
			}),
			(logs: MonitorRuleLogs) => {
				if (ruleCode) {
					const processLogs = (topics: Array<Topic>) => {
						const topicMap = topics.reduce((map, topic) => {
							map[topic.topicId] = topic;
							return map;
						}, {} as Record<TopicId, Topic>);
						setData(logs.sort((r1, r2) => {
							return r1.count === r2.count ? 0 : (r1.count < r2.count) ? 1 : -1;
						}).map(row => {
							const {topicId, factorId} = row;
							if (topicId) {
								const topic = topicMap[topicId];
								if (factorId) {
									return {
										...row,
										topicName: topic ? getTopicName(topic) : topicId,
										// eslint-disable-next-line
										factorName: (topic?.factors || []).find(factor => factor.factorId == factorId)?.name || 'Noname Factor'
									};
								} else {
									return {
										...row,
										topicName: topic ? getTopicName(topic) : topicId,
										factorName: '-'
									};
								}
							}
							return row;
						}));
						if (topicId) {
							const topic = topicMap[topicId];
							const topicName = topic ? getTopicName(topic) : topicId;
							setTitle(`${givenTitle} @ ${RuleDefs[ruleCode].name} @ ${topicName}`);
						} else {
							setTitle(`${givenTitle} @ ${RuleDefs[ruleCode].name}`);
						}
						setLoading(false);
					};

					const askTopics = () => {
						fireCache(DataQualityCacheEventTypes.ASK_DATA_LOADED, (loaded: boolean) => {
							if (loaded) {
								fireCache(DataQualityCacheEventTypes.ASK_DATA, (cacheData?: DQCCacheData) => {
									processLogs(cacheData?.topics || []);
								});
							} else {
								setTimeout(askTopics, 100);
							}
						});
					};
					askTopics();
				} else {
					setTitle(givenTitle);
					setData(logs.sort((r1, r2) => r1.count === r2.count ? 0 : (r1.count < r2.count) ? 1 : -1));
					setLoading(false);
				}
			});
	}, [fireGlobal, fireCache, start, end, givenTitle]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const reload = () => loadData(state.ruleCode, state.topicId);

	const canBreakdown = !state.topicId;
	const onBreakdownRule = (ruleCode: MonitorRuleCode) => () => {
		setState({ruleCode});
		loadData(ruleCode);
	};
	const onBreakdownTopic = (ruleCode: MonitorRuleCode, topicId: TopicId) => () => {
		setState({ruleCode, topicId});
		loadData(ruleCode, topicId);
	};
	const onBackToAll = () => {
		setState({});
		loadData();
	};
	const onBackToRule = () => {
		setState({ruleCode: state.ruleCode, topicId: undefined});
		loadData(state.ruleCode);
	};
	const format = new Intl.NumberFormat(undefined, {useGrouping: true});

	const chartData = useMemo(() => {
		if (data.length === 0) return [];
		if (state.ruleCode && state.topicId) {
			return data.map(row => ({name: row.factorName || 'Unknown', value: row.count}));
		} else if (state.ruleCode) {
			return data.map(row => ({name: row.topicName || 'Unknown', value: row.count}));
		} else {
			return data.map(row => ({name: RuleDefs[row.ruleCode].name, value: row.count}));
		}
	}, [data, state.ruleCode, state.topicId]);

	let headerButton;
	let breakdownHeaderCell: JSX.Element;
	let breakdownCell: (row: DataRow) => JSX.Element;
	if (state.ruleCode && state.topicId) {
		headerButton = {
			iconProps: {icon: ICON_BACK, transform: {rotate: 180}},
			tooltip: 'Back to Topic',
			action: onBackToRule
		};
		breakdownHeaderCell = <DataPanelBodyHeaderCell>Factor</DataPanelBodyHeaderCell>;
		breakdownCell = (row) => <DataPanelBodyDataCell>
			<span>{row.factorName}</span>
		</DataPanelBodyDataCell>;
	} else if (state.ruleCode) {
		headerButton = {
			iconProps: {icon: ICON_BACK, transform: {rotate: 180}},
			tooltip: 'Back to All',
			action: onBackToAll
		};
		breakdownHeaderCell = <DataPanelBodyHeaderCell>Topic</DataPanelBodyHeaderCell>;
		breakdownCell = (row) => {
			if ([
				MonitorRuleCode.RAW_MISMATCH_STRUCTURE,
				MonitorRuleCode.ROWS_NOT_EXISTS,
				MonitorRuleCode.ROWS_NO_CHANGE,
				MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER
			].includes(row.ruleCode)) {
				return <DataPanelBodyDataCell>
					<span>{row.topicName}</span>
				</DataPanelBodyDataCell>;
			} else {
				return <DataPanelBodyBreakdownCell breakdown={canBreakdown}
				                                   onClick={onBreakdownTopic(row.ruleCode, row.topicId!)}>
					<span>{row.topicName}</span>
				</DataPanelBodyBreakdownCell>;
			}
		};
	} else {
		breakdownHeaderCell = <DataPanelBodyHeaderCell>Rule</DataPanelBodyHeaderCell>;
		breakdownCell = (row) => <DataPanelBodyBreakdownCell breakdown={canBreakdown}
		                                                     onClick={onBreakdownRule(row.ruleCode)}>
			<span>{RuleDefs[row.ruleCode].name}</span>
		</DataPanelBodyBreakdownCell>;
	}

	const headerButtons = [
		headerButton,
		{iconProps: {icon: ICON_REFRESH}, tooltip: 'Refresh', action: reload}
	].filter(x => !!x) as Array<AdditionalDataPanelHeaderButton>;

	return <DataPanel which={which} title={title}
	                  layout={layout} defaultLayout={DEFAULT_LAYOUTS[which]}
	                  buttons={headerButtons}>
		<DataPanelBody>
			{chartData.length > 0 && !state.topicId ? <StatsChart data={chartData} type="pie"/> : null}
			<DataPanelBodyHeader columns={GRID_COLUMN_ALL}>
				<DataPanelBodyHeaderSeqCell>#</DataPanelBodyHeaderSeqCell>
				{breakdownHeaderCell}
				<DataPanelBodyHeaderCell>Occurred Times</DataPanelBodyHeaderCell>
				<DataPanelBodyHeaderCell>Last Occurred</DataPanelBodyHeaderCell>
			</DataPanelBodyHeader>
			{data.length === 0
				? <DataPanelBodyDataRow columns={GRID_COLUMN_ALL}>
					<DataPanelBodyNoDataCell>No rule monitored.</DataPanelBodyNoDataCell>
				</DataPanelBodyDataRow>
				: data.map((row, index) => {
					return <DataPanelBodyDataRow columns={GRID_COLUMN_ALL} key={index}>
						<DataPanelBodyDataSeqCell>{index + 1}</DataPanelBodyDataSeqCell>
						{breakdownCell(row)}
						<DataPanelBodyDataCell>
							<HorizontalValueBar value={row.count / 100}/>
							<HorizontalValue>{format.format(row.count)}</HorizontalValue>
						</DataPanelBodyDataCell>
						<DataPanelBodyDataCell>{row.lastOccurredTime}</DataPanelBodyDataCell>
					</DataPanelBodyDataRow>;
				})}
		</DataPanelBody>
	</DataPanel>;
};