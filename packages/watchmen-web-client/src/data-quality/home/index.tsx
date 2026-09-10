import {isPiiClassificationEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {fetchPiiReport} from '@/services/data/data-quality/pii';
import {PiiGlobalDashboard, PII_SENSITIVITY_LEVEL_LABELS, PiiSensitivityLevel} from '@/services/data/data-quality/pii-types';
import {MonitorRuleGrade, MonitorRuleLogs, MonitorRules} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs, fetchMonitorRules, isRuleOnFactor, isRuleOnTopic} from '@/services/data/data-quality/rules';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {echarts, EChartsType} from '@/widgets/basic/echarts';
import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import dayjs from 'dayjs';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {useDataQualityCacheEventBus} from '../cache/cache-event-bus';
import {DataQualityCacheEventTypes} from '../cache/cache-event-bus-types';
import {DQCCacheData} from '../cache/types';
import {
	computeAlerts,
	computeQualityScore,
	DIMENSION_LABELS,
	DimensionScore
} from '../statistics/overview/quality-dimensions';
import {SeverityBadge} from '../statistics/overview/widgets';
import {EmptyState, KpiCard, KpiRow, LoadingRows, SectionCard} from '../widgets/kpi';
import {ACCENT_COLOR, CHART_SPLIT_COLOR, PII_LEVEL_COLORS, SCORE_BAND_COLORS} from '../widgets/palette';

const DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss.SSS';
const WINDOW_DAYS = 30;

const HomeBody = styled.div.attrs({'data-widget': 'dqc-home-body'})`
	display        : flex;
	flex-direction : column;
	padding        : 0 calc(var(--margin) / 2) calc(var(--margin) / 2);
`;
const HomeColumns = styled.div.attrs({'data-widget': 'dqc-home-columns'})`
	display               : grid;
	grid-template-columns : 1fr 1fr;
	grid-gap              : calc(var(--margin) / 2);
	@media (max-width: 1200px) {
		grid-template-columns : 1fr;
	}
`;
const HomeList = styled.div.attrs({'data-widget': 'dqc-home-list'})`
	display        : flex;
	flex-direction : column;
`;
const HomeListItem = styled.div.attrs({'data-widget': 'dqc-home-list-item'})`
	display         : flex;
	align-items     : center;
	grid-gap        : calc(var(--margin) / 3);
	padding         : 6px 0;
	&:not(:last-child) {
		border-bottom : var(--border);
	}
`;
const HomeListItemText = styled.span.attrs({'data-widget': 'dqc-home-list-item-text'})`
	flex-grow      : 1;
	font-family    : var(--code-font-family);
	font-size      : 0.9em;
	white-space    : nowrap;
	overflow       : hidden;
	text-overflow  : ellipsis;
`;
const HomeListItemMeta = styled.span.attrs({'data-widget': 'dqc-home-list-item-meta'})`
	font-size   : 0.85em;
	opacity     : 0.7;
	white-space : nowrap;
`;
const HomeLink = styled.span.attrs({'data-widget': 'dqc-home-link'})`
	font-variant : petite-caps;
	font-size    : 0.85em;
	color        : var(--primary-color);
	cursor       : pointer;
	white-space  : nowrap;
	&:hover {
		text-decoration : underline;
	}
`;
const MiniRadar = styled.div.attrs({'data-widget': 'dqc-home-mini-radar'})`
	width  : 100%;
	height : 260px;
`;

const BAND_LABELS: Record<string, string> = {
	excellent: 'Excellent',
	good: 'Good',
	fair: 'Fair',
	poor: 'At Risk'
};

/** compact five-dimension radar for the home cockpit */
const DimensionRadar = (props: { dimensions: Array<DimensionScore> }) => {
	const {dimensions} = props;
	const wrapperRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<EChartsType | null>(null);

	const scored = useMemo(() => dimensions.filter(dimension => dimension.score !== null), [dimensions]);

	useEffect(() => {
		if (!wrapperRef.current || scored.length === 0) {
			return;
		}
		if (!instanceRef.current) {
			instanceRef.current = echarts.init(wrapperRef.current);
		}
		const instance = instanceRef.current;
		instance.setOption({
			tooltip: {trigger: 'item'},
			radar: {
				indicator: scored.map(dimension => ({name: DIMENSION_LABELS[dimension.dimension], max: 100})),
				center: ['50%', '54%'],
				radius: '64%',
				splitNumber: 4,
				axisName: {color: CHART_SPLIT_COLOR, fontSize: 11},
				axisLine: {lineStyle: {color: CHART_SPLIT_COLOR}},
				splitLine: {lineStyle: {color: CHART_SPLIT_COLOR}},
				splitArea: {show: false}
			},
			series: [{
				type: 'radar',
				symbolSize: 4,
				data: [{
					value: scored.map(dimension => dimension.score),
					name: 'Score',
					itemStyle: {color: ACCENT_COLOR},
					lineStyle: {color: ACCENT_COLOR, width: 2},
					areaStyle: {color: 'rgba(77,107,254,0.25)'}
				}]
			}]
		}, true);

		const resizeObserver = new ResizeObserver(() => instance.resize());
		resizeObserver.observe(wrapperRef.current);
		return () => resizeObserver.disconnect();
	}, [scored]);

	if (scored.length === 0) {
		return <EmptyState>No scored dimensions yet.</EmptyState>;
	}
	return <MiniRadar ref={wrapperRef}/>;
};

/**
 * Home cockpit: one-screen overview of data quality (score, dimensions, alerts,
 * action-required items) and data security (PII classification posture).
 */
const DataQualityHomeIndex = () => {
	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useDataQualityCacheEventBus();
	const piiEnabled = isPiiClassificationEnabled();

	const [topics, setTopics] = useState<Array<Topic>>([]);
	const [topicsReady, setTopicsReady] = useState(false);
	const [rules, setRules] = useState<MonitorRules | null>(null);
	const [logs, setLogs] = useState<MonitorRuleLogs | null>(null);
	const [piiReport, setPiiReport] = useState<PiiGlobalDashboard | null>(null);

	const window30d = useMemo(() => {
		const now = dayjs();
		return {
			start: now.subtract(WINDOW_DAYS - 1, 'day').startOf('date').format(DATE_FORMAT),
			end: now.endOf('date').format(DATE_FORMAT)
		};
	}, []);

	// topics from the DQC cache (same source as statistics panels)
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

	// all rules: global plus per-topic, fetched concurrently
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
						// one broken topic must not break the whole page
						return [];
					}
				})
			);
			return [...globalRules, ...topicRules.flat()];
		}, (allRules: MonitorRules) => setRules(allRules || []));
	}, [fireGlobal, topicsReady, topics]);

	// rule-hit logs of the last 30 days
	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchMonitorRuleLogs({criteria: {startDate: window30d.start, endDate: window30d.end}}),
			(loaded: MonitorRuleLogs) => setLogs(loaded || []));
	}, [fireGlobal, window30d]);

	// pii posture, only when the feature is enabled
	useEffect(() => {
		if (!piiEnabled) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchPiiReport(),
			(loaded: PiiGlobalDashboard) => setPiiReport(loaded));
	}, [fireGlobal, piiEnabled]);

	const quality = useMemo(() => computeQualityScore(rules ?? [], logs ?? []), [rules, logs]);
	const alerts = useMemo(() => computeAlerts(rules ?? [], logs ?? []), [rules, logs]);

	const topicMap = useMemo(() => {
		return topics.reduce((map, topic) => {
			if (topic.topicId) {
				map[topic.topicId] = topic;
			}
			return map;
		}, {} as Record<TopicId, Topic>);
	}, [topics]);

	const enabledRules = useMemo(() => (rules ?? []).filter(rule => rule.enabled), [rules]);

	// action required: topics without any enabled topic/factor rule
	const topicsWithoutRules = useMemo(() => {
		return topics.filter(topic => {
			if (!topic.topicId) {
				return false;
			}
			return !enabledRules.some(rule => {
				if (isRuleOnFactor(rule)) {
					return (rule as { topicId?: TopicId }).topicId === topic.topicId;
				}
				if (isRuleOnTopic(rule)) {
					return (rule as { topicId?: TopicId }).topicId === topic.topicId;
				}
				return false;
			});
		});
	}, [topics, enabledRules]);

	// action required: rules which keep hitting in the window
	const persistentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

	const unencryptedFactorCount = useMemo(() => {
		if (!piiReport) {
			return 0;
		}
		return (piiReport.terms ?? []).reduce((sum, term) => sum + (term.plaintextFactorCount ?? 0), 0);
	}, [piiReport]);

	const level1FactorCount = useMemo(() => {
		if (!piiReport) {
			return 0;
		}
		return (piiReport.terms ?? [])
			.filter(term => term.sensitivityLevel === PiiSensitivityLevel.LEVEL_1)
			.reduce((sum, term) => sum + (term.linkedFactorCount ?? 0), 0);
	}, [piiReport]);

	const scoreColor = quality.band ? SCORE_BAND_COLORS[quality.band] : (void 0);
	const loading = rules === null || logs === null;

	return <FullWidthPage>
		<FullWidthPageHeaderContainer>
			<PageTitle>Home</PageTitle>
		</FullWidthPageHeaderContainer>
		<HomeBody>
			<KpiRow>
				<KpiCard label="Quality Score"
				         value={<span style={{color: scoreColor}}>{quality.score ?? '-'}</span>}
				         subtext={quality.band ? BAND_LABELS[quality.band] : 'No enabled rules yet'}/>
				<KpiCard label="Alerts (30d)" value={alerts.length}
				         danger={alerts.length > 0}
				         subtext="Rule hits within last 30 days"/>
				<KpiCard label="Monitored Topics" value={topics.length}
				         subtext={topicsWithoutRules.length === 0
					         ? 'All topics covered by rules'
					         : `${topicsWithoutRules.length} topic(s) without rules`}/>
				<KpiCard label="Enabled Rules" value={enabledRules.length}
				         subtext={`${(rules ?? []).length} defined in total`}/>
			</KpiRow>

			<HomeColumns>
				<SectionCard title="Quality Dimensions">
					{loading ? <LoadingRows/> : <DimensionRadar dimensions={quality.dimensions}/>}
				</SectionCard>
				<SectionCard title="Top Alerts" badge={alerts.length}>
					{loading
						? <LoadingRows/>
						: alerts.length === 0
							? <EmptyState>No alerts in the last 30 days.</EmptyState>
							: <HomeList>
								{alerts.slice(0, 8).map((alert, index) => {
									const topicName = alert.topicId ? (topicMap[alert.topicId]?.name ?? alert.topicId) : 'All Topics';
									return <HomeListItem key={`${alert.ruleCode}-${alert.topicId}-${alert.factorId}-${index}`}>
										<SeverityBadge severity={alert.severity}>{alert.severity}</SeverityBadge>
										<HomeListItemText>{alert.ruleCode}</HomeListItemText>
										<HomeListItemMeta>{topicName}</HomeListItemMeta>
										<HomeListItemMeta>{alert.count} hit(s)</HomeListItemMeta>
									</HomeListItem>;
								})}
								<HomeListItem>
									<HomeLink onClick={() => navigate(Router.DQC_STATISTICS)}>View run statistics</HomeLink>
								</HomeListItem>
							</HomeList>}
				</SectionCard>
			</HomeColumns>

			<SectionCard title="Action Required">
				{loading
					? <LoadingRows/>
					: <HomeList>
						{topicsWithoutRules.length === 0 && persistentAlerts.length === 0 && unencryptedFactorCount === 0
							? <EmptyState>Nothing requires attention. Looking good.</EmptyState>
							: null}
						{topicsWithoutRules.length === 0 ? null : (
							<HomeListItem>
								<HomeListItemText>
									{topicsWithoutRules.length} topic(s) have no enabled monitor rules
								</HomeListItemText>
								<HomeListItemMeta>
									{topicsWithoutRules.slice(0, 3).map(topic => topic.name).join(', ')}
									{topicsWithoutRules.length > 3 ? ', …' : ''}
								</HomeListItemMeta>
								<HomeLink onClick={() => navigate(Router.DQC_RULES)}>Configure rules</HomeLink>
							</HomeListItem>
						)}
						{persistentAlerts.length === 0 ? null : (
							<HomeListItem>
								<HomeListItemText>
									{persistentAlerts.length} rule(s) hit repeatedly in the last 30 days
								</HomeListItemText>
								<HomeListItemMeta>
									Top: {persistentAlerts[0].ruleCode} ({persistentAlerts[0].count} hits)
								</HomeListItemMeta>
								<HomeLink onClick={() => navigate(Router.DQC_STATISTICS)}>Inspect alerts</HomeLink>
							</HomeListItem>
						)}
						{piiEnabled && unencryptedFactorCount > 0 ? (
							<HomeListItem>
								<HomeListItemText>
									{unencryptedFactorCount} sensitive factor(s) are stored unencrypted
								</HomeListItemText>
								<HomeListItemMeta>Encryption recommended</HomeListItemMeta>
								<HomeLink onClick={() => navigate(Router.DQC_PII)}>Review PII report</HomeLink>
							</HomeListItem>
						) : null}
					</HomeList>}
			</SectionCard>

			{piiEnabled ? <>
				<KpiRow>
					<KpiCard label="PII Terms" value={piiReport?.totalTerms ?? '-'}
					         subtext="Classification terms defined"/>
					<KpiCard label="Level 1 Factors" value={piiReport ? level1FactorCount : '-'}
					         danger={level1FactorCount > 0}
					         subtext={PII_SENSITIVITY_LEVEL_LABELS[PiiSensitivityLevel.LEVEL_1] ?? 'Highest sensitivity'}/>
					<KpiCard label="Unencrypted Factors" value={piiReport ? unencryptedFactorCount : '-'}
					         danger={unencryptedFactorCount > 0}
					         subtext="Sensitive data stored in plaintext"/>
					<KpiCard label="High-Risk Terms" value={piiReport?.highRiskTerms?.length ?? '-'}
					         danger={(piiReport?.highRiskTerms?.length ?? 0) > 0}
					         subtext="Level 1 with wide impact"/>
				</KpiRow>
				<SectionCard title="High-Risk PII Terms" badge={piiReport?.highRiskTerms?.length ?? 0}>
					{piiReport === null
						? <LoadingRows/>
						: (piiReport.highRiskTerms ?? []).length === 0
							? <EmptyState>No high-risk terms detected.</EmptyState>
							: <HomeList>
								{(piiReport.highRiskTerms ?? []).slice(0, 5).map(term => {
									return <HomeListItem key={term.termId}>
										<HomeListItemText>{term.termName}</HomeListItemText>
										<HomeListItemMeta>
											{term.linkedFactorCount} factor(s) · {term.topicCount} topic(s)
										</HomeListItemMeta>
										<HomeListItemMeta style={{color: PII_LEVEL_COLORS[term.sensitivityLevel ?? '']}}>
											{PII_SENSITIVITY_LEVEL_LABELS[term.sensitivityLevel ?? ''] ?? term.sensitivityLevel}
										</HomeListItemMeta>
									</HomeListItem>;
								})}
								<HomeListItem>
									<HomeLink onClick={() => navigate(Router.DQC_PII)}>Open data classification</HomeLink>
								</HomeListItem>
							</HomeList>}
				</SectionCard>
			</> : null}
		</HomeBody>
	</FullWidthPage>;
};

export default DataQualityHomeIndex;
