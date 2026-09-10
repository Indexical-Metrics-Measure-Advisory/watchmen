import {exportPiiReport, fetchPiiReport} from '@/services/data/data-quality/pii';
import {
	asPiiCategoryLabel,
	asPiiLevelLabel,
	PII_CATEGORY_LABELS,
	PII_SENSITIVITY_LEVEL_LABELS,
	PiiGlobalDashboard,
	PiiSensitivityLevel
} from '@/services/data/data-quality/pii-types';
import {Button} from '@/widgets/basic/button';
import {echarts, EChartsType} from '@/widgets/basic/echarts';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useRef, useState} from 'react';
import {EmptyState, LoadingRows} from '../widgets/kpi';
import {PII_LEVEL_COLORS, PIPELINE_COLOR} from '../widgets/palette';
import {
	PiiAccentCard,
	PiiCard,
	PiiCardHint,
	PiiCardTitle,
	PiiCardTitleBadge,
	PiiChartBox,
	PiiColumns,
	PiiDangerCard,
	PiiDot,
	PiiKpiLabel,
	PiiKpiRow,
	PiiKpiSubtext,
	PiiKpiValue,
	PiiLevelBadge,
	PiiMonoText,
	PiiProgress,
	PiiProgressFill,
	PiiProgressRow,
	PiiProgressText,
	PiiTable,
	PiiTableScroll,
	PiiTermListRow,
	PiiToolbar,
	PiiToolbarPlaceholder
} from './widgets';

const useChart = (build: (instance: EChartsType) => void, deps: Array<any>) => {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<EChartsType | null>(null);

	useEffect(() => {
		if (!chartRef.current) {
			return;
		}
		if (!instanceRef.current) {
			instanceRef.current = echarts.init(chartRef.current);
		}
		const instance = instanceRef.current;
		build(instance);
		const resizeObserver = new ResizeObserver(() => instance.resize());
		resizeObserver.observe(chartRef.current);
		return () => resizeObserver.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	return chartRef;
};

export const PiiReportTab = () => {
	const {fire: fireGlobal} = useEventBus();
	const [dashboard, setDashboard] = useState<PiiGlobalDashboard | null>(null);

	useEffect(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchPiiReport(),
			(loaded: PiiGlobalDashboard) => setDashboard(loaded));
	}, [fireGlobal]);

	const levelChartRef = useChart((instance) => {
		const data = Object.keys(dashboard?.bySensitivityLevel ?? {}).map(level => {
			return {
				name: PII_SENSITIVITY_LEVEL_LABELS[level] ?? level,
				value: dashboard!.bySensitivityLevel[level],
				itemStyle: {color: PII_LEVEL_COLORS[level] ?? PII_LEVEL_COLORS[PiiSensitivityLevel.LEVEL_2]}
			};
		});
		instance.setOption({
			tooltip: {trigger: 'item', formatter: '{b}: {c} ({d}%)'},
			legend: {bottom: 0},
			series: [{
				type: 'pie',
				radius: ['45%', '70%'],
				label: {show: false},
				data: data.length !== 0 ? data : [{name: 'No Data', value: 0}]
			}]
		}, {notMerge: true});
	}, [dashboard]);

	const categoryChartRef = useChart((instance) => {
		const byCategory = dashboard?.byCategory ?? {};
		const categories = Object.keys(byCategory);
		instance.setOption({
			tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}},
			grid: {left: 8, right: 32, top: 8, bottom: 8, containLabel: true},
			xAxis: {type: 'value'},
			yAxis: {
				type: 'category',
				data: categories.map(c => PII_CATEGORY_LABELS[c] ?? c)
			},
			series: [{
				type: 'bar',
				data: categories.map(c => byCategory[c]),
				itemStyle: {color: PIPELINE_COLOR, borderRadius: [0, 4, 4, 0]},
				label: {show: true, position: 'right', fontSize: 10}
			}]
		}, {notMerge: true});
	}, [dashboard]);

	if (dashboard == null) {
		return <LoadingRows rows={6}/>;
	}

	const terms = dashboard.terms ?? [];
	const totalFactors = terms.reduce((sum, t) => sum + (t.linkedFactorCount ?? 0), 0);
	const totalPipelines = terms.reduce((sum, t) => sum + (t.pipelineCount ?? 0), 0);
	const totalPlaintext = terms.reduce((sum, t) => sum + (t.plaintextFactorCount ?? 0), 0);
	const level1Terms = terms.filter(t => t.sensitivityLevel === PiiSensitivityLevel.LEVEL_1).length;
	const level1Plaintext = terms
		.filter(t => t.sensitivityLevel === PiiSensitivityLevel.LEVEL_1)
		.reduce((sum, t) => sum + (t.plaintextFactorCount ?? 0), 0);
	const highRiskTerms = dashboard.highRiskTerms ?? [];
	const topImpactTerms = (dashboard.topImpactTerms ?? []).slice(0, 5);

	const onExport = (format: 'csv' | 'xlsx') => () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await exportPiiReport(format),
			() => void 0);
	};

	return <>
		<PiiToolbar>
			<PiiToolbarPlaceholder/>
			<Button ink={ButtonInk.PRIMARY} onClick={onExport('csv')}>Export CSV</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onExport('xlsx')}>Export xlsx</Button>
		</PiiToolbar>
		<PiiKpiRow>
			<PiiCard>
				<PiiKpiLabel>Total Terms</PiiKpiLabel>
				<PiiKpiValue>{dashboard.totalTerms}</PiiKpiValue>
				<PiiKpiSubtext>
					Level 1: {level1Terms} · Level 2: {terms.length - level1Terms}
				</PiiKpiSubtext>
			</PiiCard>
			<PiiCard>
				<PiiKpiLabel>Linked Factors</PiiKpiLabel>
				<PiiKpiValue>{totalFactors}</PiiKpiValue>
				<PiiKpiSubtext>
					Encrypted: {terms.reduce((sum, t) => sum + (t.encryptedFactorCount ?? 0), 0)} · Plaintext: {totalPlaintext}
				</PiiKpiSubtext>
			</PiiCard>
			<PiiCard>
				<PiiKpiLabel>Affected Pipelines</PiiKpiLabel>
				<PiiKpiValue>{totalPipelines}</PiiKpiValue>
				<PiiKpiSubtext>
					Topics: {terms.reduce((sum, t) => sum + (t.topicCount ?? 0), 0)}
				</PiiKpiSubtext>
			</PiiCard>
			<PiiCard>
				<PiiKpiLabel>Unencrypted Factors</PiiKpiLabel>
				<PiiKpiValue danger>{totalPlaintext}</PiiKpiValue>
				<PiiKpiSubtext danger>Level 1: {level1Plaintext}</PiiKpiSubtext>
			</PiiCard>
		</PiiKpiRow>
		<PiiColumns ratio="2fr 3fr">
			<div>
				<PiiCard>
					<PiiCardTitle>Sensitivity Distribution</PiiCardTitle>
					<PiiChartBox ref={levelChartRef} height={240}/>
				</PiiCard>
				<PiiCard>
					<PiiCardTitle>Category Distribution</PiiCardTitle>
					<PiiChartBox ref={categoryChartRef} height={240}/>
				</PiiCard>
			</div>
			<div>
				<PiiCard>
					<PiiCardTitle>Term Overview</PiiCardTitle>
					{terms.length === 0
						? <EmptyState>No terms.</EmptyState>
						: <PiiTableScroll>
							<PiiTable>
								<thead>
									<tr>
										<th>Term</th>
										<th>Level</th>
										<th>Category</th>
										<th data-numeric={true}>Factors</th>
										<th data-numeric={true}>Topics</th>
										<th data-numeric={true}>Pipelines</th>
										<th>Encryption</th>
									</tr>
								</thead>
								<tbody>
									{terms.map(term => {
										const total = (term.encryptedFactorCount ?? 0) + (term.plaintextFactorCount ?? 0);
										const rate = total > 0 ? Math.round(term.encryptedFactorCount / total * 100) : 100;
										return <tr key={term.termId ?? term.termName}>
											<td>{term.termName}</td>
											<td>
												<PiiLevelBadge level={term.sensitivityLevel}>
													{asPiiLevelLabel(term.sensitivityLevel)}
												</PiiLevelBadge>
											</td>
											<td>{asPiiCategoryLabel(term.category)}</td>
											<td data-numeric={true}><PiiMonoText>{term.linkedFactorCount}</PiiMonoText></td>
											<td data-numeric={true}><PiiMonoText>{term.topicCount}</PiiMonoText></td>
											<td data-numeric={true}><PiiMonoText>{term.pipelineCount}</PiiMonoText></td>
											<td>
												<PiiProgressRow>
													<PiiProgress>
														<PiiProgressFill percent={rate} warn={rate < 75}/>
													</PiiProgress>
													<PiiProgressText>{rate}%</PiiProgressText>
												</PiiProgressRow>
											</td>
										</tr>;
									})}
								</tbody>
							</PiiTable>
						</PiiTableScroll>}
				</PiiCard>
				<PiiColumns ratio="1fr 1fr">
					<PiiDangerCard>
						<PiiCardTitle>
							High-Risk Terms
							<PiiCardTitleBadge danger>{highRiskTerms.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiCardHint>
							Level 1 terms with unencrypted factors. Handle with priority.
						</PiiCardHint>
						{highRiskTerms.length === 0
							? <EmptyState>None</EmptyState>
							: highRiskTerms.map(term => {
								return <PiiTermListRow key={term.termId ?? term.termName}>
									<PiiDot color="var(--danger-color)"/>
									<span>{term.termName}</span>
									<PiiMonoText>{term.plaintextFactorCount} factor(s)</PiiMonoText>
								</PiiTermListRow>;
							})}
					</PiiDangerCard>
					<PiiAccentCard>
						<PiiCardTitle>
							Top Impact Terms
							<PiiCardTitleBadge>{topImpactTerms.length}</PiiCardTitleBadge>
						</PiiCardTitle>
						<PiiCardHint>
							Terms linked to the most factors, topics and pipelines.
						</PiiCardHint>
						{topImpactTerms.length === 0
							? <EmptyState>None</EmptyState>
							: topImpactTerms.map(term => {
								return <PiiTermListRow key={term.termId ?? term.termName}>
									<PiiDot color="var(--primary-color)"/>
									<span>{term.termName}</span>
									<PiiMonoText>
										{term.linkedFactorCount} factor(s) · {term.topicCount} topic(s) · {term.pipelineCount} pipeline(s)
									</PiiMonoText>
								</PiiTermListRow>;
							})}
					</PiiAccentCard>
				</PiiColumns>
			</div>
		</PiiColumns>
	</>;
};
