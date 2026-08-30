import {echarts, EChartsType} from '@/widgets/basic/echarts';
import React, {useEffect, useMemo, useRef} from 'react';
import styled from 'styled-components';
import {DIMENSION_LABELS, DimensionScore} from './quality-dimensions';
import {OverviewCard, OverviewCardBody, OverviewCardHeader, OverviewCardNoData} from './widgets';

const RadarWrapper = styled.div.attrs({'data-widget': 'quality-dimension-radar'})`
	width  : 100%;
	height : 240px;
`;

const ACCENT = '#4d6bfe';
const NEUTRAL = 'rgba(127,127,127,0.5)';

/** Five-dimension quality radar (0-100 on every axis). */
export const DimensionRadarCard = (props: { dimensions: Array<DimensionScore> }) => {
	const {dimensions} = props;

	const wrapperRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<EChartsType | null>(null);

	const scored = useMemo(() => {
		return dimensions.filter(dimension => dimension.score !== null);
	}, [dimensions]);

	useEffect(() => {
		if (!wrapperRef.current) {
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
				radius: '62%',
				splitNumber: 4,
				axisName: {color: NEUTRAL, fontSize: 11},
				axisLine: {lineStyle: {color: 'rgba(127,127,127,0.35)'}},
				splitLine: {lineStyle: {color: 'rgba(127,127,127,0.3)'}},
				splitArea: {show: false}
			},
			series: [{
				type: 'radar',
				symbolSize: 4,
				data: [{
					value: scored.map(dimension => dimension.score),
					name: 'Score',
					itemStyle: {color: ACCENT},
					lineStyle: {color: ACCENT, width: 2},
					areaStyle: {color: 'rgba(77,107,254,0.25)'}
				}]
			}]
		}, true);

		const resizeObserver = new ResizeObserver(() => instance.resize());
		resizeObserver.observe(wrapperRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [scored]);

	return <OverviewCard>
		<OverviewCardHeader>Five Dimensions</OverviewCardHeader>
		<OverviewCardBody>
			{scored.length === 0
				? <OverviewCardNoData>No scored dimensions.</OverviewCardNoData>
				: <RadarWrapper ref={wrapperRef}/>}
		</OverviewCardBody>
	</OverviewCard>;
};
