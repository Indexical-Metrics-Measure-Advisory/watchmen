import {isPiiClassificationEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {fetchPiiReport} from '@/services/data/data-quality/pii';
import {PiiGlobalDashboard, PII_SENSITIVITY_LEVEL_LABELS, PiiSensitivityLevel} from '@/services/data/data-quality/pii-types';
import {MonitorRuleGrade, MonitorRuleLogs, MonitorRuleSeverity, MonitorRules} from '@/services/data/data-quality/rule-types';
import {fetchMonitorRuleLogs, fetchMonitorRules, isRuleOnFactor, isRuleOnTopic} from '@/services/data/data-quality/rules';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {echarts, EChartsType} from '@/widgets/basic/echarts';
import {FullWidthPage} from '@/widgets/basic/page';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
	faArrowRightLong,
	faBell,
	faCalendarDays,
	faChartLine,
	faDatabase,
	faFingerprint,
	faGaugeHigh,
	faListCheck,
	faLockOpen,
	faShieldHalved,
	faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import React, {ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {useDataQualityCacheEventBus} from '../cache/cache-event-bus';
import {DataQualityCacheEventTypes} from '../cache/cache-event-bus-types';
import {DQCCacheData} from '../cache/types';
import {
	bandOf,
	computeAlerts,
	computeQualityScore,
	DIMENSION_LABELS,
	DimensionScore
} from '../statistics/overview/quality-dimensions';
import {EmptyState, LoadingRows} from '../widgets/kpi';
import {
	AmbientBody,
	CardPanel,
	CardPanelAside,
	CardPanelTitle,
	CardPanelTitleRow,
	HeroHeader,
	HeroSubtitle,
	HeroTitle,
	HeroToolbar,
	IconChip,
	Pill,
	QuickLink,
	WindowPill
} from '../widgets/kit';
import {ACCENT_COLOR, CHART_SPLIT_COLOR, NEUTRAL_COLOR, PII_LEVEL_COLORS, SCORE_BAND_COLORS, SEVERITY_COLORS} from '../widgets/palette';

const DATE_FORMAT = 'YYYY/MM/DD HH:mm:ss.SSS';
const WINDOW_DAYS = 30;

const DANGER_TONE = SCORE_BAND_COLORS.poor;
const WARN_TONE = SCORE_BAND_COLORS.fair;
const SUCCESS_TONE = SCORE_BAND_COLORS.excellent;

const BAND_LABELS: Record<string, string> = {
	excellent: 'Excellent',
	good: 'Good',
	fair: 'Fair',
	poor: 'At Risk'
};

// ——— kpi tiles ———
const KpiRow = styled.div.attrs({'data-widget': 'dqc-home-kpi-row'})`
	display               : grid;
	grid-template-columns : repeat(4, 1fr);
	grid-gap              : calc(var(--margin) / 2);
	margin-bottom         : calc(var(--margin) / 2);
	@media (max-width: 1200px) {
		grid-template-columns : repeat(2, 1fr);
	}
`;
const KpiTile = styled.div.attrs({'data-widget': 'dqc-home-kpi-tile'})`
	display          : flex;
	flex-direction   : column;
	border           : var(--border);
	border-radius    : calc(var(--border-radius) * 3.5);
	background-color : var(--invert-color);
	box-shadow       : 0 1px 2px rgba(37, 38, 94, 0.04), 0 6px 18px rgba(37, 38, 94, 0.06);
	padding          : calc(var(--margin) / 2);
	transition       : box-shadow 200ms ease-in-out;
	&:hover {
		box-shadow : 0 2px 4px rgba(37, 38, 94, 0.06), 0 10px 26px rgba(37, 38, 94, 0.1);
	}
`;
const KpiTileHeader = styled.div.attrs({'data-widget': 'dqc-home-kpi-tile-header'})`
	display        : flex;
	align-items    : center;
	grid-gap       : calc(var(--margin) / 3);
`;
const KpiLabel = styled.span.attrs({'data-widget': 'dqc-home-kpi-label'})`
	font-size      : 0.8em;
	letter-spacing : 0.06em;
	text-transform : uppercase;
	opacity        : 0.6;
`;
const KpiValue = styled.div.attrs<{ tone?: string }>(({tone}) => {
	return {
		'data-widget': 'dqc-home-kpi-value',
		style: tone ? {color: tone} : (void 0)
	};
})<{ tone?: string }>`
	margin-top  : calc(var(--margin) / 4);
	font-family : var(--code-font-family);
	font-size   : 2.2em;
	font-weight : var(--font-bold);
	line-height : 1.15;
`;
const KpiFoot = styled.div.attrs({'data-widget': 'dqc-home-kpi-foot'})`
	display     : flex;
	align-items : center;
	grid-gap    : calc(var(--margin) / 4);
	margin-top  : 8px;
	min-height  : 18px;
`;
const KpiSubtext = styled.span.attrs({'data-widget': 'dqc-home-kpi-subtext'})`
	font-size      : 0.85em;
	opacity        : 0.6;
	white-space    : nowrap;
	overflow       : hidden;
	text-overflow  : ellipsis;
`;
const BarTrack = styled.div.attrs({'data-widget': 'dqc-home-bar-track'})`
	flex-grow      : 1;
	height         : 5px;
	border-radius  : 999px;
	overflow       : hidden;
	background-color : var(--hover-color);
`;
const BarFill = styled.div.attrs<{ fill?: string; ratio?: number }>(({fill, ratio = 0}) => {
	return {
		'data-widget': 'dqc-home-bar-fill',
		style: {
			width: `${Math.max(0, Math.min(100, ratio))}%`,
			backgroundColor: fill ?? 'var(--border-color)'
		}
	};
})<{ fill?: string; ratio?: number }>`
	height        : 100%;
	border-radius : 999px;
	transition    : width 400ms ease-in-out;
`;

// ——— section panels ———
const Columns = styled.div.attrs({'data-widget': 'dqc-home-columns'})`
	display            : grid;
	grid-template-columns : 11fr 9fr;
	grid-column-gap    : calc(var(--margin) / 2);
	@media (max-width: 1200px) {
		grid-template-columns : 1fr;
	}
`;

// ——— list rows ———
const List = styled.div.attrs({'data-widget': 'dqc-home-list'})`
	display        : flex;
	flex-direction : column;
`;
const ListRow = styled.div.attrs({'data-widget': 'dqc-home-list-row'})`
	display         : flex;
	align-items     : center;
	grid-gap        : calc(var(--margin) / 3);
	padding         : 7px calc(var(--margin) / 6);
	border-radius   : calc(var(--border-radius) * 1.5);
	&:hover {
		background-color : var(--hover-color);
	}
`;
const ListText = styled.span.attrs({'data-widget': 'dqc-home-list-text'})`
	flex-grow      : 1;
	min-width      : 0;
	font-family    : var(--code-font-family);
	font-size      : 0.9em;
	font-weight    : var(--font-demi-bold);
	white-space    : nowrap;
	overflow       : hidden;
	text-overflow  : ellipsis;
`;
const ListMeta = styled.span.attrs({'data-widget': 'dqc-home-list-meta'})`
	max-width      : 38%;
	font-size      : 0.82em;
	opacity        : 0.65;
	white-space    : nowrap;
	overflow       : hidden;
	text-overflow  : ellipsis;
`;
const ActionTexts = styled.div.attrs({'data-widget': 'dqc-home-action-texts'})`
	display        : flex;
	flex-direction : column;
	flex-grow      : 1;
	min-width      : 0;
	grid-gap       : 2px;
`;
const ActionMain = styled.div.attrs({'data-widget': 'dqc-home-action-main'})`
	font-size      : 0.95em;
	font-weight    : var(--font-demi-bold);
	white-space    : nowrap;
	overflow       : hidden;
	text-overflow  : ellipsis;
`;
const ActionMeta = styled.div.attrs({'data-widget': 'dqc-home-action-meta'})`
	font-size      : 0.82em;
	opacity        : 0.6;
	white-space    : nowrap;
	overflow       : hidden;
	text-overflow  : ellipsis;
`;
const ActionButton = styled.button.attrs({'data-widget': 'dqc-home-action-button'})`
	display          : inline-flex;
	align-items      : center;
	grid-gap         : 6px;
	margin-left      : auto;
	padding          : 3px 12px;
	border           : var(--border);
	border-radius    : 999px;
	background-color : transparent;
	color            : var(--primary-color);
	font-family      : inherit;
	font-size        : 0.8em;
	font-weight      : var(--font-demi-bold);
	white-space      : nowrap;
	cursor           : pointer;
	&:hover {
		border-color     : var(--primary-color);
		background-color : var(--hover-color);
	}
`;
const ListFooter = styled.div.attrs({'data-widget': 'dqc-home-list-footer'})`
	display        : flex;
	justify-content : flex-end;
	padding-top    : calc(var(--margin) / 4);
`;
const TextLink = styled.span.attrs({'data-widget': 'dqc-home-link'})`
	display       : inline-flex;
	align-items   : center;
	grid-gap      : 6px;
	font-size     : 0.85em;
	font-weight   : var(--font-demi-bold);
	color         : var(--primary-color);
	cursor        : pointer;
	white-space   : nowrap;
	&:hover {
		text-decoration : underline;
	}
`;

// ——— quality dimensions ———
const MiniRadar = styled.div.attrs({'data-widget': 'dqc-home-mini-radar'})`
	width  : 100%;
	height : 250px;
`;
const DimensionRows = styled.div.attrs({'data-widget': 'dqc-home-dimension-rows'})`
	display        : flex;
	flex-direction : column;
	grid-gap       : 8px;
	margin-top     : calc(var(--margin) / 3);
	padding-top    : calc(var(--margin) / 3);
	border-top     : var(--border);
`;
const DimensionRow = styled.div.attrs({'data-widget': 'dqc-home-dimension-row'})`
	display     : flex;
	align-items : center;
	grid-gap    : calc(var(--margin) / 3);
`;
const DimensionName = styled.span.attrs({'data-widget': 'dqc-home-dimension-name'})`
	width      : 110px;
	font-size  : 0.85em;
	opacity    : 0.75;
	white-space: nowrap;
`;
const DimensionScoreText = styled.span.attrs<{ tone?: string }>(({tone}) => {
	return {
		'data-widget': 'dqc-home-dimension-score',
		style: tone ? {color: tone} : (void 0)
	};
})<{ tone?: string }>`
	width       : 42px;
	text-align  : right;
	font-family : var(--code-font-family);
	font-size   : 0.85em;
	font-weight : var(--font-demi-bold);
`;

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
				center: ['50%', '52%'],
				radius: '62%',
				splitNumber: 4,
				axisName: {color: 'rgb(140,150,165)', fontSize: 11},
				axisLine: {lineStyle: {color: CHART_SPLIT_COLOR}},
				splitLine: {lineStyle: {color: CHART_SPLIT_COLOR}},
				splitArea: {show: true, areaStyle: {color: ['rgba(128,128,128,0.03)', 'rgba(128,128,128,0.08)']}}
			},
			series: [{
				type: 'radar',
				symbolSize: 4,
				data: [{
					value: scored.map(dimension => dimension.score),
					name: 'Score',
					itemStyle: {color: ACCENT_COLOR},
					lineStyle: {color: ACCENT_COLOR, width: 2},
					areaStyle: {color: 'rgba(77,107,254,0.24)'}
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

const HomeKpi = (props: {
	icon: IconDefinition;
	tone?: string;
	label: string;
	value: ReactNode;
	valueTone?: string;
	foot?: ReactNode;
}) => {
	const {icon, tone, label, value, valueTone, foot} = props;
	return <KpiTile>
		<KpiTileHeader>
			<IconChip tone={tone}><FontAwesomeIcon icon={icon}/></IconChip>
			<KpiLabel>{label}</KpiLabel>
		</KpiTileHeader>
		<KpiValue tone={valueTone}>{value}</KpiValue>
		{foot != null ? <KpiFoot>{foot}</KpiFoot> : null}
	</KpiTile>;
};

const HomeSection = (props: { title: ReactNode; aside?: ReactNode; children?: ReactNode }) => {
	const {title, aside, children} = props;
	return <CardPanel>
		<CardPanelTitleRow>
			<CardPanelTitle>{title}</CardPanelTitle>
			{aside != null ? <CardPanelAside>{aside}</CardPanelAside> : null}
		</CardPanelTitleRow>
		{children}
	</CardPanel>;
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

	const fatalCount = useMemo(
		() => alerts.filter(alert => alert.severity === MonitorRuleSeverity.FATAL).length, [alerts]);
	const warnCount = useMemo(
		() => alerts.filter(alert => alert.severity === MonitorRuleSeverity.WARN).length, [alerts]);

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
		<AmbientBody>
			<HeroHeader>
				<div>
					<HeroTitle>Data Quality Home</HeroTitle>
					<HeroSubtitle>One-screen posture of quality, alerts and data security.</HeroSubtitle>
				</div>
				<HeroToolbar>
					<WindowPill>
						<FontAwesomeIcon icon={faCalendarDays}/>
						Last 30 days
					</WindowPill>
					<QuickLink onClick={() => navigate(Router.DQC_STATISTICS)}>
						<FontAwesomeIcon icon={faChartLine}/>
						Statistics
					</QuickLink>
					<QuickLink onClick={() => navigate(Router.DQC_RULES)}>
						<FontAwesomeIcon icon={faListCheck}/>
						Rules
					</QuickLink>
					{piiEnabled
						? <QuickLink onClick={() => navigate(Router.DQC_PII)}>
							<FontAwesomeIcon icon={faShieldHalved}/>
							Classification
						</QuickLink>
						: null}
				</HeroToolbar>
			</HeroHeader>

			<KpiRow>
				<HomeKpi icon={faGaugeHigh} tone={scoreColor ?? NEUTRAL_COLOR}
				         label="Quality Score"
				         value={quality.score ?? '—'} valueTone={scoreColor}
				         foot={quality.score !== null && scoreColor
					         ? <>
						         <BarTrack><BarFill fill={scoreColor} ratio={quality.score}/></BarTrack>
						         <Pill tone={scoreColor}>{quality.band ? BAND_LABELS[quality.band] : ''}</Pill>
					         </>
					         : <KpiSubtext>No enabled rules yet</KpiSubtext>}/>
				<HomeKpi icon={faBell} tone={alerts.length > 0 ? DANGER_TONE : SUCCESS_TONE}
				         label="Alerts · 30d"
				         value={alerts.length} valueTone={alerts.length > 0 ? DANGER_TONE : (void 0)}
				         foot={<>
					         <KpiSubtext>Rule hits within window</KpiSubtext>
					         {fatalCount > 0 ? <Pill tone={DANGER_TONE}>{fatalCount} fatal</Pill> : null}
					         {warnCount > 0 ? <Pill tone={WARN_TONE}>{warnCount} warn</Pill> : null}
				         </>}/>
				<HomeKpi icon={faDatabase} tone={ACCENT_COLOR}
				         label="Monitored Topics"
				         value={topics.length}
				         foot={topicsWithoutRules.length === 0
					         ? <Pill tone={SUCCESS_TONE}>All covered</Pill>
					         : <Pill tone={WARN_TONE}>{topicsWithoutRules.length} w/o rules</Pill>}/>
				<HomeKpi icon={faListCheck} tone={ACCENT_COLOR}
				         label="Enabled Rules"
				         value={enabledRules.length}
				         foot={<>
					         <BarTrack>
						         <BarFill fill={ACCENT_COLOR}
						                  ratio={(rules ?? []).length === 0 ? 0 : 100 * enabledRules.length / (rules ?? []).length}/>
					         </BarTrack>
					         <KpiSubtext>of {(rules ?? []).length} defined</KpiSubtext>
				         </>}/>
			</KpiRow>

			<Columns>
				<HomeSection title="Quality Dimensions"
				             aside={quality.score !== null
					             ? <Pill tone={scoreColor ?? undefined}>
						             {quality.score}{quality.band ? ` · ${BAND_LABELS[quality.band]}` : ''}
					             </Pill>
					             : null}>
					{loading
						? <LoadingRows/>
						: <>
							<DimensionRadar dimensions={quality.dimensions}/>
							<DimensionRows>
								{quality.dimensions.map(dimension => {
									const tone = dimension.score === null ? null : SCORE_BAND_COLORS[bandOf(dimension.score)];
									return <DimensionRow key={dimension.dimension}
									                     title={dimension.score === null ? 'No enabled rules in this dimension' : (void 0)}>
										<DimensionName>{DIMENSION_LABELS[dimension.dimension]}</DimensionName>
										<DimensionScoreText tone={tone ?? undefined}
										                    style={dimension.score === null ? {opacity: 0.4} : (void 0)}>
											{dimension.score ?? '—'}
										</DimensionScoreText>
										<BarTrack><BarFill fill={tone ?? undefined} ratio={dimension.score ?? 0}/></BarTrack>
									</DimensionRow>;
								})}
							</DimensionRows>
						</>}
				</HomeSection>
				<HomeSection title="Top Alerts"
				             aside={<Pill tone={alerts.length > 0 ? DANGER_TONE : undefined}>{alerts.length}</Pill>}>
					{loading
						? <LoadingRows/>
						: alerts.length === 0
							? <EmptyState>No alerts in the last 30 days.</EmptyState>
							: <List>
								{alerts.slice(0, 8).map((alert, index) => {
									const topicName = alert.topicId ? (topicMap[alert.topicId]?.name ?? alert.topicId) : 'All Topics';
									return <ListRow key={`${alert.ruleCode}-${alert.topicId}-${alert.factorId}-${index}`}>
										<Pill tone={SEVERITY_COLORS[alert.severity] ?? NEUTRAL_COLOR}>{alert.severity}</Pill>
										<ListText>{alert.ruleCode}</ListText>
										<ListMeta>{topicName}</ListMeta>
										<Pill>{alert.count} hits</Pill>
									</ListRow>;
								})}
								<ListFooter>
									<TextLink onClick={() => navigate(Router.DQC_STATISTICS)}>
										View run statistics
										<FontAwesomeIcon icon={faArrowRightLong}/>
									</TextLink>
								</ListFooter>
							</List>}
				</HomeSection>
			</Columns>

			<HomeSection title="Action Required">
				{loading
					? <LoadingRows/>
					: <List>
						{topicsWithoutRules.length === 0 && persistentAlerts.length === 0 && unencryptedFactorCount === 0
							? <EmptyState>Nothing requires attention. Looking good.</EmptyState>
							: null}
						{topicsWithoutRules.length === 0 ? null : (
							<ListRow>
								<IconChip tone={WARN_TONE}><FontAwesomeIcon icon={faTriangleExclamation}/></IconChip>
								<ActionTexts>
									<ActionMain>{topicsWithoutRules.length} topic(s) have no enabled monitor rules</ActionMain>
									<ActionMeta>
										{topicsWithoutRules.slice(0, 3).map(topic => topic.name).join(', ')}
										{topicsWithoutRules.length > 3 ? ', …' : ''}
									</ActionMeta>
								</ActionTexts>
								<ActionButton onClick={() => navigate(Router.DQC_RULES)}>
									Configure rules
									<FontAwesomeIcon icon={faArrowRightLong}/>
								</ActionButton>
							</ListRow>
						)}
						{persistentAlerts.length === 0 ? null : (
							<ListRow>
								<IconChip tone={WARN_TONE}><FontAwesomeIcon icon={faTriangleExclamation}/></IconChip>
								<ActionTexts>
									<ActionMain>{persistentAlerts.length} rule(s) hit repeatedly in the last 30 days</ActionMain>
									<ActionMeta>Top: {persistentAlerts[0].ruleCode} ({persistentAlerts[0].count} hits)</ActionMeta>
								</ActionTexts>
								<ActionButton onClick={() => navigate(Router.DQC_STATISTICS)}>
									Inspect alerts
									<FontAwesomeIcon icon={faArrowRightLong}/>
								</ActionButton>
							</ListRow>
						)}
						{piiEnabled && unencryptedFactorCount > 0 ? (
							<ListRow>
								<IconChip tone={DANGER_TONE}><FontAwesomeIcon icon={faTriangleExclamation}/></IconChip>
								<ActionTexts>
									<ActionMain>{unencryptedFactorCount} sensitive factor(s) are stored unencrypted</ActionMain>
									<ActionMeta>Encryption recommended</ActionMeta>
								</ActionTexts>
								<ActionButton onClick={() => navigate(Router.DQC_PII)}>
									Review PII report
									<FontAwesomeIcon icon={faArrowRightLong}/>
								</ActionButton>
							</ListRow>
						) : null}
					</List>}
			</HomeSection>

			{piiEnabled ? <>
				<KpiRow>
					<HomeKpi icon={faShieldHalved} tone={ACCENT_COLOR}
					         label="PII Terms"
					         value={piiReport?.totalTerms ?? '—'}
					         foot={<KpiSubtext>Classification terms defined</KpiSubtext>}/>
					<HomeKpi icon={faFingerprint} tone={PII_LEVEL_COLORS[PiiSensitivityLevel.LEVEL_1]}
					         label="Level 1 Factors"
					         value={piiReport ? level1FactorCount : '—'}
					         valueTone={level1FactorCount > 0 ? PII_LEVEL_COLORS[PiiSensitivityLevel.LEVEL_1] : (void 0)}
					         foot={<KpiSubtext>{PII_SENSITIVITY_LEVEL_LABELS[PiiSensitivityLevel.LEVEL_1] ?? 'Highest sensitivity'}</KpiSubtext>}/>
					<HomeKpi icon={faLockOpen} tone={WARN_TONE}
					         label="Unencrypted Factors"
					         value={piiReport ? unencryptedFactorCount : '—'}
					         valueTone={unencryptedFactorCount > 0 ? WARN_TONE : (void 0)}
					         foot={<KpiSubtext>Sensitive data stored in plaintext</KpiSubtext>}/>
					<HomeKpi icon={faTriangleExclamation} tone={DANGER_TONE}
					         label="High-Risk Terms"
					         value={piiReport?.highRiskTerms?.length ?? '—'}
					         valueTone={(piiReport?.highRiskTerms?.length ?? 0) > 0 ? DANGER_TONE : (void 0)}
					         foot={<KpiSubtext>Level 1 with wide impact</KpiSubtext>}/>
				</KpiRow>
				<HomeSection title="High-Risk PII Terms"
				             aside={<Pill tone={DANGER_TONE}>{piiReport?.highRiskTerms?.length ?? 0}</Pill>}>
					{piiReport === null
						? <LoadingRows/>
						: (piiReport.highRiskTerms ?? []).length === 0
							? <EmptyState>No high-risk terms detected.</EmptyState>
							: <List>
								{(piiReport.highRiskTerms ?? []).slice(0, 5).map(term => {
									return <ListRow key={term.termId}>
										<ListText>{term.termName}</ListText>
										<ListMeta>
											{term.linkedFactorCount} factor(s) · {term.topicCount} topic(s)
										</ListMeta>
										<Pill tone={PII_LEVEL_COLORS[term.sensitivityLevel ?? '']}>
											{PII_SENSITIVITY_LEVEL_LABELS[term.sensitivityLevel ?? ''] ?? term.sensitivityLevel}
										</Pill>
									</ListRow>;
								})}
								<ListFooter>
									<TextLink onClick={() => navigate(Router.DQC_PII)}>
										Open data classification
										<FontAwesomeIcon icon={faArrowRightLong}/>
									</TextLink>
								</ListFooter>
							</List>}
				</HomeSection>
			</> : null}
		</AmbientBody>
	</FullWidthPage>;
};

export default DataQualityHomeIndex;
