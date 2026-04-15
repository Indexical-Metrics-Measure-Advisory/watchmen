import {isSynonymDQCEnabled} from '@/feature-switch';
import {MonitorRuleCode, MonitorRuleLog, MonitorRuleLogs} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs} from '@/services/data/data-quality/rules';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {isNotSynonymTopic} from '@/services/data/tuples/topic-utils';
import {Calendar} from '@/widgets/basic/calendar';
import {ICON_REFRESH} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import dayjs from 'dayjs';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDataQualityCacheEventBus} from '../../cache/cache-event-bus';
import {DataQualityCacheEventTypes} from '../../cache/cache-event-bus-types';
import {DQCCacheData} from '../../cache/types';
import {RuleDefs} from '../../rule-defs';
import {getTopicName} from '../../utils';
import {DEFAULT_LAYOUTS} from '../constants';
import {StatsChart} from '../chart';
import {DataPanel} from '../data-panel';
import {useLayout} from '../data-panel/use-layout';
import {
	DataPanelBody,
	DataPanelBodyDataCell,
	DataPanelBodyDataRow,
	DataPanelBodyDataSeqCell,
	DataPanelBodyHeader,
	DataPanelBodyHeaderCell,
	DataPanelBodyHeaderSeqCell,
	DataPanelBodyNoDataCell,
	HorizontalValue,
	HorizontalValueBar
} from '../data-panel/widgets';
import {DataPanels} from '../types';
import {DataPanelCriteria, DataPanelCriteriaLabel} from './widgets';

const GRID_ALL_COLUMNS = '20% 15% 20% 1fr 150px';
const GRID_COLUMNS_NO_FACTOR = '20% 20% 1fr 150px';
const GRID_COLUMNS_NO_TOPIC = '35% 1fr 150px';

interface Criteria {
	startDate: string;
	endDate: string;
	ruleCode?: MonitorRuleCode;
	topicId?: TopicId;
}

export const FreeWalkPanel = () => {
	const {layout} = useLayout(DataPanels.FREE_WALK);

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useDataQualityCacheEventBus();
	const [topics, setTopics] = useState<Array<Topic>>([]);
	const [criteria, setCriteria] = useState<Criteria>({
		startDate: dayjs().subtract(3, 'day').startOf('date').format('YYYY/MM/DD HH:mm:ss'),
		endDate: dayjs().startOf('date').subtract(1, 'millisecond').format('YYYY/MM/DD HH:mm:ss')
	});
	const [data, setData] = useState<Array<MonitorRuleLog>>([]);

	const debounceRef = useRef<number | null>(null);

	useEffect(() => {
		const ask = () => {
			fireCache(DataQualityCacheEventTypes.ASK_DATA_LOADED, (loaded: boolean) => {
				if (loaded) {
					fireCache(DataQualityCacheEventTypes.ASK_DATA, (data?: DQCCacheData) => {
						setTopics(data?.topics || []);
					});
				} else {
					setTimeout(() => ask(), 100);
				}
			});
		};
		ask();
	}, [fireCache]);

	const loadData = useCallback((c: Criteria) => {
		if (debounceRef.current) {
			window.clearTimeout(debounceRef.current);
		}
		debounceRef.current = window.setTimeout(() => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchMonitorRuleLogs({criteria: c}),
				(logs: MonitorRuleLogs) => {
					setData(logs.sort((r1, r2) => {
						return r1.count === r2.count ? 0 : (r1.count < r2.count) ? 1 : -1;
					}));
				});
		}, 300);
	}, [fireGlobal]);

	useEffect(() => {
		loadData(criteria);
	}, [loadData, criteria]);

	const changeCriteria = (newCriteria: Partial<Criteria>) => {
		const updated = {...criteria, ...newCriteria};
		setCriteria(updated);
		loadData(updated);
	};
	const onStartDateChanged = (value?: string) => {
		changeCriteria({
			startDate: value || dayjs().subtract(1, 'month').add(1, 'day').startOf('date').format('YYYY/MM/DD HH:mm:ss')
		});
	};
	const onEndDateChanged = (value?: string) => {
		changeCriteria({
			endDate: value || dayjs().endOf('date').format('YYYY/MM/DD HH:mm:ss')
		});
	};
	const onRuleCodeChanged = (option: DropdownOption) => {
		changeCriteria({ruleCode: option.value === '' ? (void 0) : option.value as MonitorRuleCode});
	};
	const onTopicChanged = (option: DropdownOption) => {
		changeCriteria({topicId: option.value === '' ? (void 0) : option.value as TopicId});
	};

	const showCriteria = layout.spanColumn === 3 && layout.spanRow === 3;
	let gridColumns = GRID_ALL_COLUMNS;
	let showTopicColumn = true;
	let showFactorColumn = true;
	if (criteria.ruleCode && criteria.topicId) {
		// all
	} else if (criteria.ruleCode && !criteria.topicId) {
		gridColumns = GRID_COLUMNS_NO_FACTOR;
		showFactorColumn = false;
	} else if (!criteria.ruleCode && criteria.topicId) {
		// show all
	} else {
		gridColumns = GRID_COLUMNS_NO_TOPIC;
		showTopicColumn = false;
		showFactorColumn = false;
	}
	const ruleOptions = [
		{value: '', label: 'Any Rule'},
		...Object.keys(RuleDefs).filter(ruleCode => {
			return RuleDefs[ruleCode as MonitorRuleCode].enabled;
		}).map(ruleCode => {
			return {value: ruleCode, label: RuleDefs[ruleCode as MonitorRuleCode].name};
		}).sort((o1, o2) => {
			return o1.label.toLowerCase().localeCompare(o2.label.toLowerCase());
		})
	];
	const topicMap = topics.reduce((map, topic) => {
		map[topic.topicId] = topic;
		return map;
	}, {} as Record<TopicId, Topic>);
	const topicOptions = [
		{value: '', label: 'Any Topic'},
		...topics.filter(topic => {
			return isSynonymDQCEnabled() || isNotSynonymTopic(topic);
		}).map(topic => {
			return {value: topic.topicId, label: getTopicName(topic)};
		}).sort((o1, o2) => {
			return o1.label.toLowerCase().localeCompare(o2.label.toLowerCase());
		})
	];
	const format = new Intl.NumberFormat(undefined, {useGrouping: true});
	const reload = () => loadData(criteria);
	const headerButtons = [{iconProps: {icon: ICON_REFRESH}, tooltip: 'Refresh', action: reload}];

	const chartData = useMemo(() => {
		if (data.length === 0) return [];
		return data.map(row => {
			const ruleName = RuleDefs[row.ruleCode].name;
			return {name: ruleName, value: row.count};
		});
	}, [data]);

	return <DataPanel which={DataPanels.FREE_WALK} title="Free Walk"
	                  layout={layout} defaultLayout={DEFAULT_LAYOUTS[DataPanels.FREE_WALK]}
	                  buttons={headerButtons}>
		{showCriteria
			? <DataPanelCriteria>
				<DataPanelCriteriaLabel>From</DataPanelCriteriaLabel>
				<Calendar value={criteria.startDate} onChange={onStartDateChanged}/>
				<DataPanelCriteriaLabel>To</DataPanelCriteriaLabel>
				<Calendar value={criteria.endDate} onChange={onEndDateChanged}/>
				<DataPanelCriteriaLabel>Rule</DataPanelCriteriaLabel>
				<Dropdown value={criteria.ruleCode || ''} options={ruleOptions} onChange={onRuleCodeChanged}/>
				<DataPanelCriteriaLabel>Topic</DataPanelCriteriaLabel>
				<Dropdown value={criteria.topicId || ''} options={topicOptions} onChange={onTopicChanged}/>
			</DataPanelCriteria>
			: null}
		<DataPanelBody>
			{chartData.length > 0 ? <StatsChart data={chartData} type="bar" title="Rule Distribution"/> : null}
			<DataPanelBodyHeader columns={gridColumns}>
				<DataPanelBodyHeaderSeqCell>#</DataPanelBodyHeaderSeqCell>
				{showTopicColumn ? <DataPanelBodyHeaderCell>Topic</DataPanelBodyHeaderCell> : null}
				{showFactorColumn ? <DataPanelBodyHeaderCell>Factor</DataPanelBodyHeaderCell> : null}
				<DataPanelBodyHeaderCell>Rule</DataPanelBodyHeaderCell>
				<DataPanelBodyHeaderCell>Occurred Times</DataPanelBodyHeaderCell>
				<DataPanelBodyHeaderCell>Last Occurred</DataPanelBodyHeaderCell>
			</DataPanelBodyHeader>
			{data.length === 0
				? <DataPanelBodyDataRow columns={gridColumns}>
					<DataPanelBodyNoDataCell>No rule monitored.</DataPanelBodyNoDataCell>
				</DataPanelBodyDataRow>
				: data.map((row, index) => {
					const {ruleCode, topicId, factorId} = row;
					const ruleName = RuleDefs[ruleCode].name;
					const topic = topicId ? topicMap[topicId] : (void 0);
					const topicName = topic ? getTopicName(topic) : '';
					let factorName;
					if (factorId) {
						// eslint-disable-next-line
						factorName = (topic?.factors || []).find(factor => factor.factorId == factorId)?.name || 'Noname Factor';
					} else if (topicId) {
						factorName = '-';
					}
					return <DataPanelBodyDataRow columns={gridColumns} key={index}>
						<DataPanelBodyDataSeqCell>{index + 1}</DataPanelBodyDataSeqCell>
						{showTopicColumn ? <DataPanelBodyDataCell>{topicName}</DataPanelBodyDataCell> : null}
						{showFactorColumn ? <DataPanelBodyDataCell>{factorName}</DataPanelBodyDataCell> : null}
						<DataPanelBodyDataCell>{ruleName}</DataPanelBodyDataCell>
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