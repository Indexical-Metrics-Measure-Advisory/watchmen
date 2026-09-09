import {fetchPiiLineage} from '@/services/data/data-quality/pii';
import {
	PiiClassificationTerm,
	PiiLineageReport,
	PiiSensitivityLevel,
	PiiTraceRoute
} from '@/services/data/data-quality/pii-types';
import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import {echarts, EChartsType} from '@/widgets/basic/echarts';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
	buildLineageDisplayModel,
	buildRouteDisplayChain,
	PII_EDGE_DOWNSTREAM,
	PII_EDGE_MAPS_TO,
	PII_EDGE_UPSTREAM,
	PII_NODE_TYPE_FACTOR,
	PII_NODE_TYPE_PIPELINE,
	PII_NODE_TYPE_SOURCE_FIELD,
	PII_NODE_TYPE_SOURCE_TABLE,
	PII_NODE_TYPE_TERM,
	PII_NODE_TYPE_TOPIC,
	PiiLineageDisplayModel
} from './lineage-graph';
import {
	PiiCard,
	PiiCardTitle,
	PiiCardTitleBadge,
	PiiChartBox,
	PiiColumns,
	PiiGraphLegendNote,
	PiiLineageList,
	PiiLineageListItem,
	PiiMonoText,
	PiiNoData,
	PiiProgress,
	PiiProgressFill,
	PiiProgressText,
	PiiRouteArrow,
	PiiRouteChain,
	PiiRouteDiagnostics,
	PiiRouteItem,
	PiiRouteList,
	PiiRouteStep,
	PiiRouteTitle,
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
const COLOR_TERM = 'rgb(126,87,194)';
const COLOR_TOPIC = 'rgb(64,110,220)';
const COLOR_SOURCE = 'rgb(180,140,90)';

const COLOR_EDGE_UPSTREAM = 'rgb(64,110,220)';
const COLOR_EDGE_DOWNSTREAM = 'rgb(13,115,119)';
const COLOR_EDGE_MAPS_TO = 'rgb(145,152,163)';

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 90;

// legend categories, index aligned with node assignment below
const CATEGORY_TERM = 'Term';
const CATEGORY_LEVEL_1 = 'Factor (Level 1)';
const CATEGORY_LEVEL_2 = 'Factor (Level 2)';
const CATEGORY_FACTOR = 'Factor';
const CATEGORY_TOPIC = 'Topic';
const CATEGORY_PIPELINE = 'Pipeline';
const CATEGORY_SOURCE = 'Source';

const NODE_TYPE_LABELS: Record<string, string> = {
	[PII_NODE_TYPE_TERM]: 'PII Term',
	[PII_NODE_TYPE_FACTOR]: 'Topic Factor',
	[PII_NODE_TYPE_TOPIC]: 'Topic',
	[PII_NODE_TYPE_PIPELINE]: 'Pipeline',
	[PII_NODE_TYPE_SOURCE_TABLE]: 'Source Table',
	[PII_NODE_TYPE_SOURCE_FIELD]: 'Source Field'
};

const categoryOfNode = (node: { type: string; sensitivity?: string }): number => {
	if (node.type === PII_NODE_TYPE_TERM) {
		return 0;
	}
	if (node.type === PII_NODE_TYPE_FACTOR) {
		if (node.sensitivity === PiiSensitivityLevel.LEVEL_1) {
			return 1;
		}
		if (node.sensitivity === PiiSensitivityLevel.LEVEL_2) {
			return 2;
		}
		return 3;
	}
	if (node.type === PII_NODE_TYPE_TOPIC) {
		return 4;
	}
	if (node.type === PII_NODE_TYPE_PIPELINE) {
		return 5;
	}
	return 6;
};

const symbolOfNode = (type: string): string => {
	switch (type) {
		case PII_NODE_TYPE_TERM:
			return 'roundRect';
		case PII_NODE_TYPE_TOPIC:
			return 'rect';
		case PII_NODE_TYPE_PIPELINE:
			return 'diamond';
		case PII_NODE_TYPE_SOURCE_TABLE:
		case PII_NODE_TYPE_SOURCE_FIELD:
			return 'triangle';
		default:
			return 'circle';
	}
};

const truncateLabel = (name: string): string => {
	return name.length > 16 ? `${name.substring(0, 15)}…` : name;
};

const buildChartOption = (model: PiiLineageDisplayModel) => {
	return {
		tooltip: {
			formatter: (params: any) => {
				if (params.dataType === 'edge') {
					const kindLabel = params.data.kind === PII_EDGE_UPSTREAM ? 'flows into (upstream)'
						: params.data.kind === PII_EDGE_DOWNSTREAM ? 'flows to (downstream)' : 'maps to';
					return `${params.data.sourceName} → ${params.data.targetName}<br/><span style="opacity:0.7">${kindLabel}</span>`;
				}
				const lines = [
					`<b>${params.data.name}</b>`,
					`Type: ${params.data.typeLabel ?? '-'}`,
					params.data.topicName ? `Topic: ${params.data.topicName}` : null,
					`Sensitivity: ${params.data.sensitivityLabel ?? '-'}`
				].filter(line => line != null);
				return lines.join('<br/>');
			}
		},
		legend: {
			data: [
				{name: CATEGORY_TERM, itemStyle: {color: COLOR_TERM}},
				{name: CATEGORY_LEVEL_1, itemStyle: {color: COLOR_LEVEL_1}},
				{name: CATEGORY_LEVEL_2, itemStyle: {color: COLOR_LEVEL_2}},
				{name: CATEGORY_FACTOR, itemStyle: {color: COLOR_NEUTRAL}},
				{name: CATEGORY_TOPIC, itemStyle: {color: COLOR_TOPIC}},
				{name: CATEGORY_PIPELINE, itemStyle: {color: COLOR_PIPELINE}},
				{name: CATEGORY_SOURCE, itemStyle: {color: COLOR_SOURCE}}
			],
			bottom: 0,
			itemWidth: 12,
			itemHeight: 12,
			textStyle: {fontSize: 10}
		},
		series: [{
			type: 'graph',
			layout: 'none',
			roam: true,
			draggable: true,
			categories: [
				{name: CATEGORY_TERM},
				{name: CATEGORY_LEVEL_1},
				{name: CATEGORY_LEVEL_2},
				{name: CATEGORY_FACTOR},
				{name: CATEGORY_TOPIC},
				{name: CATEGORY_PIPELINE},
				{name: CATEGORY_SOURCE}
			],
			label: {
				show: true,
				position: 'bottom',
				fontSize: 10,
				formatter: (params: any) => truncateLabel(params.data.name ?? '')
			},
			edgeSymbol: ['none', 'arrow'],
			edgeSymbolSize: 7,
			emphasis: {focus: 'adjacency'},
			data: model.nodes.map(node => {
				const category = categoryOfNode(node);
				return {
					id: node.id,
					name: node.name,
					x: node.column * COLUMN_WIDTH,
					y: node.row * ROW_HEIGHT,
					category,
					symbol: symbolOfNode(node.type),
					symbolSize: node.type === PII_NODE_TYPE_TERM ? 46 : node.type === PII_NODE_TYPE_FACTOR ? 26 : 36,
					typeLabel: NODE_TYPE_LABELS[node.type] ?? node.type,
					topicName: node.topicName,
					sensitivityLabel: node.sensitivity ?? 'N/A'
				};
			}),
			links: model.edges.map(edge => {
				const sourceNode = model.nodes.find(node => node.id === edge.source);
				const targetNode = model.nodes.find(node => node.id === edge.target);
				return {
					source: edge.source,
					target: edge.target,
					sourceName: sourceNode?.name ?? edge.source,
					targetName: targetNode?.name ?? edge.target,
					kind: edge.kind,
					lineStyle: {
						color: edge.kind === PII_EDGE_UPSTREAM ? COLOR_EDGE_UPSTREAM
							: edge.kind === PII_EDGE_DOWNSTREAM ? COLOR_EDGE_DOWNSTREAM : COLOR_EDGE_MAPS_TO,
						type: edge.kind === PII_EDGE_MAPS_TO ? 'dashed' : 'solid',
						curveness: 0.05
					}
				};
			})
		}]
	};
};

const RouteChainView = (props: {
	route: PiiTraceRoute;
	upstream: boolean;
	report: PiiLineageReport;
}) => {
	const {route, upstream, report} = props;
	const chain = buildRouteDisplayChain(route, upstream, report.linkedFactors ?? []);

	return <PiiRouteItem>
		<PiiRouteTitle>{route.title}</PiiRouteTitle>
		<PiiRouteChain>
			{chain.map((step, index) => {
				return <React.Fragment key={`${step.kind}-${step.name}-${index}`}>
					{index === 0 ? null : <PiiRouteArrow/>}
					<PiiRouteStep kind={step.kind}>{step.name}</PiiRouteStep>
				</React.Fragment>;
			})}
		</PiiRouteChain>
		{(route.diagnostics ?? []).length === 0
			? null
			: <PiiRouteDiagnostics>{route.diagnostics.join(' ')}</PiiRouteDiagnostics>}
	</PiiRouteItem>;
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

	const model = useMemo(() => {
		return report == null ? null : buildLineageDisplayModel(report);
	}, [report]);

	useEffect(() => {
		if (!chartRef.current || model == null) {
			return;
		}
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}
		const instance = chartInstanceRef.current;
		instance.setOption(buildChartOption(model), {notMerge: true});

		const resizeObserver = new ResizeObserver(() => instance.resize());
		resizeObserver.observe(chartRef.current);
		return () => resizeObserver.disconnect();
	}, [model]);

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
	// pipelines from display graph nodes
	const relatedPipelines = (model?.nodes ?? []).filter(node => node.type === PII_NODE_TYPE_PIPELINE);
	const upstreamRoutes = report?.upstreamRoutes ?? [];
	const downstreamRoutes = report?.downstreamRoutes ?? [];
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
		{report != null && model != null
			? <>
				<PiiColumns ratio="3fr 2fr">
					<PiiCard>
						<PiiCardTitle>
							Lineage Propagation Graph
							<PiiCardTitleBadge>{model.nodes.length} nodes</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiChartBox ref={chartRef} height={460}/>
						<PiiGraphLegendNote>
							<span style={{'--legend-color': COLOR_EDGE_UPSTREAM} as React.CSSProperties}>
								Upstream flow
							</span>
							<span style={{'--legend-color': COLOR_EDGE_DOWNSTREAM} as React.CSSProperties}>
								Downstream flow
							</span>
							<span style={{'--legend-color': COLOR_EDGE_MAPS_TO} as React.CSSProperties}>
								Term mapping
							</span>
							<span>Drag to adjust · scroll to zoom</span>
						</PiiGraphLegendNote>
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
						{coverage != null
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
				<PiiColumns ratio="1fr 1fr">
					<PiiCard>
						<PiiCardTitle>
							Upstream Routes
							<PiiCardTitleBadge>{upstreamRoutes.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiRouteList>
							{upstreamRoutes.length === 0
								? <PiiNoData>No upstream lineage resolved</PiiNoData>
								: upstreamRoutes.map(route => {
									return <RouteChainView key={route.id} route={route} upstream={true}
									                       report={report}/>;
								})}
						</PiiRouteList>
					</PiiCard>
					<PiiCard>
						<PiiCardTitle>
							Downstream Routes
							<PiiCardTitleBadge>{downstreamRoutes.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiRouteList>
							{downstreamRoutes.length === 0
								? <PiiNoData>No downstream lineage resolved</PiiNoData>
								: downstreamRoutes.map(route => {
									return <RouteChainView key={route.id} route={route} upstream={false}
									                       report={report}/>;
								})}
						</PiiRouteList>
					</PiiCard>
				</PiiColumns>
			</>
			: <PiiNoData>Select a term and analyze its lineage.</PiiNoData>}
	</>;
};
