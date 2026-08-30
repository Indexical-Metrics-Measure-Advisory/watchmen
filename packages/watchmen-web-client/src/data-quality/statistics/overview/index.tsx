import {MonitorRuleGrade, MonitorRuleLogs, MonitorRules} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs, fetchMonitorRules} from '@/services/data/data-quality/rules';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import dayjs from 'dayjs';
import React, {useEffect, useMemo, useState} from 'react';
import {useDataQualityCacheEventBus} from '../../cache/cache-event-bus';
import {DataQualityCacheEventTypes} from '../../cache/cache-event-bus-types';
import {DQCCacheData} from '../../cache/types';
import {AlertsCard} from './alerts-card';
import {DimensionRadarCard} from './dimension-radar';
import {computeAlerts, computeQualityScore, DIMENSION_LABELS, rulesByDimension} from './quality-dimensions';
import {ScoreCard} from './score-card';
import {RuleShareCard} from './rule-share-card';
import {OverviewContainer} from './widgets';

const DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss.SSS';
const WINDOW_DAYS = 30;

/**
 * Quality overview band: quality score, five-dimension radar, alerts and rule
 * share. Sits on top of the run-statistics data panels.
 */
export const QualityOverview = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useDataQualityCacheEventBus();

	const [topics, setTopics] = useState<Array<Topic>>([]);
	const [topicsReady, setTopicsReady] = useState(false);
	const [rules, setRules] = useState<MonitorRules>([]);
	const [logs, setLogs] = useState<MonitorRuleLogs>([]);
	const [prevLogs, setPrevLogs] = useState<MonitorRuleLogs>([]);
	const [loaded, setLoaded] = useState(false);

	const windows = useMemo(() => {
		const now = dayjs();
		return {
			start: now.subtract(WINDOW_DAYS - 1, 'day').startOf('date').format(DATE_FORMAT),
			end: now.endOf('date').format(DATE_FORMAT),
			prevStart: now.subtract(WINDOW_DAYS * 2 - 1, 'day').startOf('date').format(DATE_FORMAT),
			prevEnd: now.subtract(WINDOW_DAYS, 'day').endOf('date').format(DATE_FORMAT)
		};
	}, []);

	// Topics come from the DQC cache (same source as the panels below).
	useEffect(() => {
		let timer: number | null = null;
		const ask = () => {
			fireCache(DataQualityCacheEventTypes.ASK_DATA_LOADED, (cacheLoaded: boolean) => {
				if (cacheLoaded) {
					fireCache(DataQualityCacheEventTypes.ASK_DATA, (cacheData?: DQCCacheData) => {
						setTopics(cacheData?.topics || []);
						setTopicsReady(true);
					});
				} else {
					timer = window.setTimeout(ask, 200);
				}
			});
		};
		ask();
		return () => {
			if (timer !== null) {
				window.clearTimeout(timer);
			}
		};
	}, [fireCache]);

	// All rules: global rules plus every topic's rules (one remote request banner).
	useEffect(() => {
		if (!topicsReady) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			const globalRules = await fetchMonitorRules({criteria: {grade: MonitorRuleGrade.GLOBAL}});
			const topicRules = await Promise.all(
				topics.filter(topic => !!topic.topicId).map(async topic => {
					try {
						return await fetchMonitorRules({criteria: {grade: MonitorRuleGrade.TOPIC, topicId: topic.topicId!}});
					} catch {
						// one broken topic must not break the whole overview
						return [];
					}
				})
			);
			return [...globalRules, ...topicRules.flat()];
		}, (allRules: MonitorRules) => setRules(allRules || []));
	}, [fireGlobal, topicsReady, topics]);

	// Rule-hit logs for the current and the previous window (period comparison).
	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			const [current, previous] = await Promise.all([
				fetchMonitorRuleLogs({criteria: {startDate: windows.start, endDate: windows.end}}),
				fetchMonitorRuleLogs({criteria: {startDate: windows.prevStart, endDate: windows.prevEnd}})
			]);
			return [current || [], previous || []];
		}, ([current, previous]: [MonitorRuleLogs, MonitorRuleLogs]) => {
			setLogs(current);
			setPrevLogs(previous);
			setLoaded(true);
		});
	}, [fireGlobal, windows]);

	const topicMap = useMemo(() => {
		return topics.reduce((map, topic) => {
			if (topic.topicId) {
				map[topic.topicId] = topic;
			}
			return map;
		}, {} as Record<TopicId, Topic>);
	}, [topics]);

	const quality = useMemo(() => computeQualityScore(rules, logs), [rules, logs]);
	const previousQuality = useMemo(() => computeQualityScore(rules, prevLogs), [rules, prevLogs]);
	const alerts = useMemo(() => computeAlerts(rules, logs), [rules, logs]);
	const shareData = useMemo(() => {
		return rulesByDimension(rules)
			.filter(item => item.count > 0)
			.map(item => ({name: DIMENSION_LABELS[item.dimension], value: item.count}));
	}, [rules]);

	const scoreHint = useMemo(() => {
		if (!rules.some(rule => rule.enabled)) {
			return 'No enabled rules yet';
		} else if (loaded && logs.length === 0) {
			return 'No rule hits in range';
		}
		return (void 0);
	}, [rules, loaded, logs]);

	return <OverviewContainer>
		<ScoreCard score={quality.score} band={quality.band}
		           previousScore={previousQuality.score} hint={scoreHint}/>
		<DimensionRadarCard dimensions={quality.dimensions}/>
		<AlertsCard alerts={alerts} topicMap={topicMap}/>
		<RuleShareCard data={shareData}/>
	</OverviewContainer>;
};
