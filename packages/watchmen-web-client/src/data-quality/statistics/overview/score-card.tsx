import React from 'react';
import styled from 'styled-components';
import {ScoreBand} from './quality-dimensions';
import {OverviewCard, OverviewCardBody, OverviewCardHeader} from './widgets';

const BAND_COLORS: Record<ScoreBand, string> = {
	excellent: '#2e9e63',
	good: '#4d6bfe',
	fair: '#d8901f',
	poor: '#d64545'
};

const BAND_LABELS: Record<ScoreBand, string> = {
	excellent: 'Excellent',
	good: 'Good',
	fair: 'Fair',
	poor: 'At Risk'
};

const ScoreRing = styled.div.attrs<{ size: number }>(({size}) => {
	return {'data-widget': 'quality-score-ring', style: {width: size, height: size}};
})<{ size: number }>`
	position   : relative;
	align-self : center;
`;

const ScoreRingCenter = styled.div`
	position        : absolute;
	top             : 0;
	left            : 0;
	width           : 100%;
	height          : 100%;
	display         : flex;
	flex-direction  : column;
	align-items     : center;
	justify-content : center;
`;

const ScoreValue = styled.div.attrs<{ color?: string }>(({color}) => {
	return {'data-widget': 'quality-score-value', style: {color}};
})<{ color?: string }>`
	font-family : var(--title-font-family);
	font-size   : 2.6em;
	font-weight : 600;
	line-height : 1.1;
`;

const ScoreBandLabel = styled.div.attrs<{ color?: string }>(({color}) => {
	return {'data-widget': 'quality-score-band', style: {color}};
})<{ color?: string }>`
	font-size : 0.9em;
`;

const ScoreDelta = styled.div.attrs<{ color: string }>(({color}) => {
	return {'data-widget': 'quality-score-delta', style: {color}};
})<{ color: string }>`
	align-self  : center;
	font-size   : 0.9em;
	margin-top  : calc(var(--margin) / 3);
`;

const ScoreHint = styled.div`
	align-self  : center;
	font-size   : 0.85em;
	color       : var(--font-color);
	opacity     : 0.6;
	margin-top  : calc(var(--margin) / 4);
`;

const SIZE = 170;
const STROKE = 13;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Quality-score hero: SVG ring gauge + band label + period-over-period delta. */
export const ScoreCard = (props: {
	score: number | null;
	band: ScoreBand | null;
	previousScore?: number | null;
	hint?: string;
}) => {
	const {score, band, previousScore, hint} = props;

	const color = band ? BAND_COLORS[band] : (void 0);
	const progress = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
	const delta = (score !== null && previousScore != null)
		? Math.round((score - previousScore) * 10) / 10
		: null;

	return <OverviewCard>
		<OverviewCardHeader>Quality Score</OverviewCardHeader>
		<OverviewCardBody>
			<div style={{
				display: 'flex', flexDirection: 'column', flex: 1,
				justifyContent: 'center', padding: 'calc(var(--margin) / 2) 0'
			}}>
				<ScoreRing size={SIZE}>
					<svg width={SIZE} height={SIZE} style={{transform: 'rotate(-90deg)'}}>
						<circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
						        stroke="rgba(127,127,127,0.2)" strokeWidth={STROKE}/>
						{score !== null ? <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
						                          stroke={color} strokeWidth={STROKE} strokeLinecap="round"
						                          strokeDasharray={CIRCUMFERENCE}
						                          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
						                          style={{transition: 'stroke-dashoffset 700ms ease-in-out'}}/>
							: null}
					</svg>
					<ScoreRingCenter>
						<ScoreValue color={score !== null ? color : (void 0)}>
							{score !== null ? score.toFixed(1) : '—'}
						</ScoreValue>
						{band ? <ScoreBandLabel color={color}>{BAND_LABELS[band]}</ScoreBandLabel> : null}
					</ScoreRingCenter>
				</ScoreRing>
				{delta !== null
					? <ScoreDelta color={delta > 0 ? '#2e9e63' : (delta < 0 ? '#d64545' : '#7a7a7a')}>
						{delta > 0 ? '▲' : (delta < 0 ? '▼' : '■')} {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} vs previous period
					</ScoreDelta>
					: null}
				{hint ? <ScoreHint>{hint}</ScoreHint> : null}
			</div>
		</OverviewCardBody>
	</OverviewCard>;
};
