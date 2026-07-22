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
import {
	PiiCard,
	PiiCardTitle,
	PiiCardTitleBadge,
	PiiChartBox,
	PiiColumns,
	PiiKpiLabel,
	PiiKpiRow,
	PiiKpiSubtext,
	PiiKpiValue,
	PiiLevelBadge,
	PiiMonoText,
	PiiNoData,
	PiiProgress,
	PiiProgressFill,
	PiiProgressText,
	PiiTable,
	PiiToolbar,
	PiiToolbarPlaceholder
} from './widgets';

const COLOR_LEVEL_1 = 'rgb(222,89,99)';
const COLOR_LEVEL_2 = 'rgb(255,161,0)';
const COLOR_PRIMARY = 'rgb(13,115,119)';

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
				itemStyle: {color: level === PiiSensitivityLevel.LEVEL_1 ? COLOR_LEVEL_1 : COLOR_LEVEL_2}
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
				itemStyle: {color: COLOR_PRIMARY, borderRadius: [0, 4, 4, 0]},
				label: {show: true, position: 'right', fontSize: 10}
			}]
		}, {notMerge: true});
	}, [dashboard]);

	if (dashboard == null) {
		return <PiiNoData>Loading...</PiiNoData>;
	}

	const terms = dashboard.terms ?? [];
	const totalFactors = terms.reduce((sum, t) => sum + (t.linkedFactorCount ?? 0), 0);
	const totalPipelines = terms.reduce((sum, t) => sum + (t.pipelineCount ?? 0), 0);
	const totalPlaintext = terms.reduce((sum, t) => sum + (t.plaintextFactorCount ?? 0), 0);
	const level1Terms = terms.filter(t => t.sensitivityLevel === PiiSensitivityLevel.LEVEL_1).length;
	const level1Plaintext = terms
		.filter(t => t.sensitivityLevel === PiiSensitivityLevel.LEVEL_1)
		.reduce((sum, t) => sum + (t.plaintextFactorCount ?? 0), 0);

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
					Metrics: {terms.reduce((sum, t) => sum + (t.metricCount ?? 0), 0)}
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
						? <PiiNoData>No terms.</PiiNoData>
						: <div style={{overflowX: 'auto'}}>
							<PiiTable>
								<thead>
									<tr>
										<th>Term</th>
										<th>Level</th>
										<th>Category</th>
										<th style={{textAlign: 'right'}}>Factors</th>
										<th style={{textAlign: 'right'}}>Topics</th>
										<th style={{textAlign: 'right'}}>Pipelines</th>
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
											<td style={{textAlign: 'right'}}><PiiMonoText>{term.linkedFactorCount}</PiiMonoText></td>
											<td style={{textAlign: 'right'}}><PiiMonoText>{term.topicCount}</PiiMonoText></td>
											<td style={{textAlign: 'right'}}><PiiMonoText>{term.pipelineCount}</PiiMonoText></td>
											<td>
												<div style={{display: 'flex', alignItems: 'center'}}>
													<PiiProgress style={{width: 60}}>
														<PiiProgressFill percent={rate} warn={rate < 75}/>
													</PiiProgress>
													<PiiProgressText>{rate}%</PiiProgressText>
												</div>
											</td>
										</tr>;
									})}
								</tbody>
							</PiiTable>
						</div>}
				</PiiCard>
				<PiiCard style={{borderLeft: '3px solid var(--danger-color)'}}>
					<PiiCardTitle>
						High-Risk Terms
						<PiiCardTitleBadge style={{backgroundColor: 'var(--danger-color)'}}>
							{(dashboard.highRiskTerms ?? []).length}
						</PiiCardTitleBadge>
					</PiiCardTitle>
					<div style={{fontSize: '0.9em', opacity: 0.75, marginBottom: 8}}>
						Level 1 terms with unencrypted factors. Handle with priority.
					</div>
					{(dashboard.highRiskTerms ?? []).length === 0
						? <PiiNoData>None</PiiNoData>
						: dashboard.highRiskTerms.map(term => {
							return <div key={term.termId ?? term.termName}
							            style={{display: 'flex', alignItems: 'center', padding: '4px 0'}}>
								<span style={{
									width: 8, height: 8, borderRadius: 4,
									backgroundColor: 'var(--danger-color)', marginRight: 8
								}}/>
								<span>{term.termName}</span>
								<PiiMonoText style={{marginLeft: 'auto', opacity: 0.75}}>
									{term.plaintextFactorCount} factor(s)
								</PiiMonoText>
							</div>;
						})}
				</PiiCard>
			</div>
		</PiiColumns>
	</>;
};
