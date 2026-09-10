import {echarts, EChartsType} from '@/widgets/basic/echarts';
import React, {useEffect, useRef} from 'react';
import styled from 'styled-components';
import {ACCENT_COLOR, CHART_SPLIT_COLOR, NEUTRAL_COLOR, SERIES_COLORS} from '../../widgets/palette';

const ChartWrapper = styled.div`
	width: 100%;
	height: 200px;
	min-height: 150px;
`;

interface ChartDataItem {
	name: string;
	value: number;
}

interface StatsChartProps {
	data: Array<ChartDataItem>;
	title?: string;
	type?: 'pie' | 'bar';
}

export const StatsChart = (props: StatsChartProps) => {
	const {data, title, type = 'pie'} = props;

	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<EChartsType | null>(null);

	useEffect(() => {
		if (!chartRef.current) return;

		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}

		const instance = chartInstanceRef.current;

		if (type === 'pie') {
			instance.setOption({
				color: SERIES_COLORS,
				title: title ? {
					text: title,
					left: 'center',
					top: 10,
					textStyle: {
						fontSize: 14,
						fontWeight: 'normal',
						color: NEUTRAL_COLOR
					}
				} : {},
				tooltip: {
					trigger: 'item',
					formatter: '{b}: {c} ({d}%)'
				},
				legend: {
					orient: 'horizontal',
					bottom: 10,
					type: 'scroll',
					textStyle: {color: NEUTRAL_COLOR}
				},
				series: [{
					type: 'pie',
					radius: ['40%', '70%'],
					center: ['50%', title ? '55%' : '50%'],
					avoidLabelOverlap: true,
					itemStyle: {
						borderRadius: 4,
						// echarts cannot consume css variables; use theme-neutral split color as slice separator
						borderColor: CHART_SPLIT_COLOR,
						borderWidth: 2
					},
					label: {
						show: true,
						formatter: '{b}: {d}%',
						color: NEUTRAL_COLOR
					},
					data: data.length > 0 ? data : [{name: 'No Data', value: 0}]
				}]
			});
		} else {
			instance.setOption({
				title: title ? {
					text: title,
					left: 'center',
					top: 10,
					textStyle: {
						fontSize: 14,
						fontWeight: 'normal',
						color: NEUTRAL_COLOR
					}
				} : {},
				tooltip: {
					trigger: 'axis',
					axisPointer: {type: 'shadow'}
				},
				grid: {
					left: '3%',
					right: '4%',
					bottom: '15%',
					top: title ? '18%' : '8%',
					containLabel: true
				},
				xAxis: {
					type: 'category',
					data: data.map(d => d.name),
					axisLabel: {
						rotate: data.length > 5 ? 30 : 0,
						fontSize: 10,
						color: NEUTRAL_COLOR
					},
					axisLine: {lineStyle: {color: CHART_SPLIT_COLOR}}
				},
				yAxis: {
					type: 'value',
					axisLabel: {color: NEUTRAL_COLOR},
					splitLine: {lineStyle: {color: CHART_SPLIT_COLOR}}
				},
				series: [{
					type: 'bar',
					data: data.map(d => d.value),
					itemStyle: {
						color: ACCENT_COLOR,
						borderRadius: [4, 4, 0, 0]
					},
					label: {
						show: true,
						position: 'top',
						fontSize: 10,
						color: NEUTRAL_COLOR
					}
				}]
			});
		}

		const resizeObserver = new ResizeObserver(() => {
			instance.resize();
		});
		resizeObserver.observe(chartRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [data, title, type]);

	return <ChartWrapper ref={chartRef}/>;
};
