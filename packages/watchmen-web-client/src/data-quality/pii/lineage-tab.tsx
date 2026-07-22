import {fetchPiiLineage} from '@/services/data/data-quality/pii';
import {
	PiiClassificationTerm,
	PiiLineageReport,
	PiiSensitivityLevel
} from '@/services/data/data-quality/pii-types';
import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import {echarts, EChartsType} from '@/widgets/basic/echarts';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useRef, useState} from 'react';
import {
	PiiCard,
	PiiCardTitle,
	PiiCardTitleBadge,
	PiiChartBox,
	PiiColumns,
	PiiLineageList,
	PiiLineageListItem,
	PiiMonoText,
	PiiNoData,
	PiiProgress,
	PiiProgressFill,
	PiiProgressText,
	PiiSlider,
	PiiToolbar,
	PiiToolbarDropdown,
	PiiToolbarLabel,
	PiiToolbarPlaceholder,
	PiiWarnNote
} from './widgets';

// chart colors follow theme default palette (echarts cannot consume css vars directly)
const COLOR_LEVEL_1 = 'rgb(222,89,99)';
const COLOR_LEVEL_2 = 'rgb(255,161,0)';
const COLOR_NEUTRAL = 'rgb(145,152,163)';
const COLOR_PIPELINE = 'rgb(13,115,119)';

const nodeColor = (node: { type?: string; sensitivity?: string }): string => {
	if (node.sensitivity === PiiSensitivityLevel.LEVEL_1) {
		return COLOR_LEVEL_1;
	}
	if (node.sensitivity === PiiSensitivityLevel.LEVEL_2) {
		return COLOR_LEVEL_2;
	}
	if (node.type === 'pipeline' || node.type === 'metric') {
		return COLOR_PIPELINE;
	}
	return COLOR_NEUTRAL;
};

export const PiiLineageTab = (props: { terms: Array<PiiClassificationTerm> }) => {
	const {terms} = props;

	const {fire: fireGlobal} = useEventBus();
	const [termId, setTermId] = useState<string>('');
	const [depth, setDepth] = useState<number>(3);
	const [report, setReport] = useState<PiiLineageReport | null>(null);
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<EChartsType | null>(null);

	useEffect(() => {
		if (!termId && terms.length !== 0) {
			setTermId(terms[0].termId ?? '');
		}
	}, [terms, termId]);

	useEffect(() => {
		if (!chartRef.current || !report) {
			return;
		}
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}
		const instance = chartInstanceRef.current;
		const nodes = report.graphData?.nodes ?? [];
		const edges = report.graphData?.edges ?? [];
		instance.setOption({
			tooltip: {
				formatter: (params: any) => {
					if (params.dataType === 'edge') {
						return `${params.data.source} → ${params.data.target}`;
					}
					return `Type: ${params.data.nodeType ?? '-'}<br/>Sensitivity: ${params.data.sensitivityLabel ?? '-'}`;
				}
			},
			series: [{
				type: 'graph',
				layout: 'force',
				roam: true,
				label: {show: true, position: 'bottom', fontSize: 10},
				force: {repulsion: 200, edgeLength: 120, gravity: 0.1},
				emphasis: {focus: 'adjacency'},
				data: nodes.map(node => {
					return {
						id: node.id,
						name: node.name,
						nodeType: node.type,
						sensitivityLabel: node.sensitivity ?? 'N/A',
						symbolSize: node.type === 'topic_factor' ? 30 : 45,
						itemStyle: {color: nodeColor(node)}
					};
				}),
				links: edges.map(edge => {
					return {
						source: edge.from,
						target: edge.to,
						lineStyle: {color: COLOR_PIPELINE, curveness: 0.1}
					};
				})
			}]
		}, {notMerge: true});

		const resizeObserver = new ResizeObserver(() => instance.resize());
		resizeObserver.observe(chartRef.current);
		return () => resizeObserver.disconnect();
	}, [report]);

	const termOptions: Array<DropdownOption> = terms.map(term => {
		return {value: term.termId ?? '', label: term.name};
	});

	const onAnalyze = () => {
		if (!termId) {
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchPiiLineage({termId, maxDepth: depth}),
			(loaded: PiiLineageReport) => setReport(loaded));
	};

	// related topics aggregated from linked factors
	const topicMap = (report?.linkedFactors ?? []).reduce((map, lf) => {
		const name = lf.topicName ?? lf.topicId;
		map[name] = (map[name] ?? 0) + 1;
		return map;
	}, {} as Record<string, number>);
	const relatedTopics = Object.keys(topicMap).map(name => ({name, factorCount: topicMap[name]}));
	// pipelines from graph nodes
	const relatedPipelines = (report?.graphData?.nodes ?? []).filter(node => node.type === 'pipeline');
	const relatedMetrics = report?.metrics ?? [];
	const coverage = report?.encryptionCoverage;
	const coverageRatio = coverage && coverage.total > 0 ? Math.round(coverage.encrypted / coverage.total * 100) : 0;

	return <>
		<PiiToolbar>
			<PiiToolbarLabel>Term</PiiToolbarLabel>
			<PiiToolbarDropdown width={200}>
				<Dropdown options={termOptions} value={termId}
				          onChange={(option) => {
					          setTermId(option.value);
					          setReport(null);
				          }}/>
			</PiiToolbarDropdown>
			<PiiToolbarLabel>Depth</PiiToolbarLabel>
			<PiiSlider min={1} max={5} step={1} value={depth}
			           onChange={(e) => setDepth(Number(e.target.value))}/>
			<PiiMonoText style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>{depth} hops</PiiMonoText>
			<PiiToolbarPlaceholder/>
			<Button ink={ButtonInk.PRIMARY} onClick={onAnalyze}>Analyze Lineage</Button>
		</PiiToolbar>
		{report != null
			? <PiiColumns ratio="3fr 2fr">
				<PiiCard>
					<PiiCardTitle>Lineage Propagation Graph</PiiCardTitle>
					<PiiChartBox ref={chartRef} height={420}/>
				</PiiCard>
				<div>
					<PiiCard>
						<PiiCardTitle>
							Related Topics
							<PiiCardTitleBadge>{relatedTopics.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiLineageList>
							{relatedTopics.length === 0
								? <PiiNoData>None</PiiNoData>
								: relatedTopics.map(topic => {
									return <PiiLineageListItem key={topic.name}>
										<PiiMonoText>{topic.name}</PiiMonoText>
										<span>{topic.factorCount} factor(s)</span>
									</PiiLineageListItem>;
								})}
						</PiiLineageList>
					</PiiCard>
					<PiiCard>
						<PiiCardTitle>
							Related Pipelines
							<PiiCardTitleBadge>{relatedPipelines.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiLineageList>
							{relatedPipelines.length === 0
								? <PiiNoData>None</PiiNoData>
								: relatedPipelines.map(node => {
									return <PiiLineageListItem key={node.id}>
										<PiiMonoText>{node.name}</PiiMonoText>
									</PiiLineageListItem>;
								})}
						</PiiLineageList>
					</PiiCard>
					<PiiCard>
						<PiiCardTitle>
							Related Metrics
							<PiiCardTitleBadge>{relatedMetrics.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiLineageList>
							{relatedMetrics.length === 0
								? <PiiNoData>None</PiiNoData>
								: relatedMetrics.map(metric => {
									return <PiiLineageListItem key={metric.metricId ?? metric.metricName}>
										<PiiMonoText>{metric.metricName}</PiiMonoText>
									</PiiLineageListItem>;
								})}
						</PiiLineageList>
					</PiiCard>
					{ coverage != null
						? <PiiCard>
							<PiiCardTitle>
								Encryption Coverage
								<PiiMonoText style={{marginLeft: 'auto'}}>
									{coverage.encrypted}/{coverage.total}
								</PiiMonoText>
							</PiiCardTitle>
							<div style={{display: 'flex', alignItems: 'center'}}>
								<PiiProgress style={{width: 120}}>
									<PiiProgressFill percent={coverageRatio}/>
								</PiiProgress>
								<PiiProgressText>{coverageRatio}%</PiiProgressText>
							</div>
							<div style={{fontSize: '0.85em', opacity: 0.75, marginTop: 8}}>
								Encrypted {coverage.encrypted} · Plaintext {coverage.plaintext}
							</div>
							{coverage.plaintext > 0
								? <PiiWarnNote>
									{coverage.plaintext} unencrypted factor(s) hold sensitive data.
									Encryption is recommended.
								</PiiWarnNote>
								: null}
						</PiiCard>
						: null}
				</div>
			</PiiColumns>
			: <PiiNoData>Select a term and analyze its lineage.</PiiNoData>}
	</>;
};
