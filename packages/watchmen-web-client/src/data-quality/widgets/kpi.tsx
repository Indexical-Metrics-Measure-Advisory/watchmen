import React, {ReactNode} from 'react';
import styled from 'styled-components';
import {CardPanel, CardPanelTitle} from './kit';

/**
 * Shared KPI / card / state components for the data-quality module.
 * Consolidates the previously duplicated PiiCard/PiiKpi* and OverviewCard systems.
 * All styles consume theme CSS variables so they work in both light and dark themes.
 */

// ——— KPI ———
export const KpiRow = styled.div.attrs({'data-widget': 'dqc-kpi-row'})`
	display               : grid;
	grid-template-columns : repeat(4, 1fr);
	grid-gap              : calc(var(--margin) / 2);
	margin-bottom         : calc(var(--margin) / 2);
	@media (max-width: 1200px) {
		grid-template-columns : repeat(2, 1fr);
	}
`;

const KpiCardContainer = styled(CardPanel)`
	padding    : calc(var(--margin) / 2);
	margin-bottom : 0;
	transition : box-shadow 200ms ease-in-out;
	&:hover {
		box-shadow : 0 2px 4px rgba(37, 38, 94, 0.06), 0 10px 26px rgba(37, 38, 94, 0.1);
	}
`;
const KpiCardHeader = styled.div.attrs({'data-widget': 'dqc-kpi-card-header'})`
	display        : flex;
	align-items    : center;
	font-size      : 0.8em;
	letter-spacing : 0.06em;
	text-transform : uppercase;
	opacity        : 0.6;
	margin-bottom  : 4px;
`;
const KpiCardValue = styled.div.attrs<{ danger?: boolean }>(({danger = false}) => {
	return {
		'data-widget': 'dqc-kpi-card-value',
		style: {color: danger ? 'var(--danger-color)' : 'var(--font-color)'}
	};
})<{ danger?: boolean }>`
	font-family : var(--code-font-family);
	font-size   : 2em;
	font-weight : var(--font-bold);
	line-height : 1.2;
`;
const KpiCardSubtext = styled.div.attrs<{ danger?: boolean }>(({danger = false}) => {
	return {
		'data-widget': 'dqc-kpi-card-subtext',
		style: {color: danger ? 'var(--danger-color)' : (void 0)}
	};
})<{ danger?: boolean }>`
	font-size  : 0.85em;
	opacity    : 0.6;
	margin-top : 4px;
`;

export const KpiCard = (props: {
	label: string;
	value: ReactNode;
	subtext?: ReactNode;
	danger?: boolean;
	children?: ReactNode;
}) => {
	const {label, value, subtext, danger = false, children} = props;
	return <KpiCardContainer>
		<KpiCardHeader>{label}</KpiCardHeader>
		<KpiCardValue danger={danger}>{value}</KpiCardValue>
		{subtext != null ? <KpiCardSubtext danger={danger}>{subtext}</KpiCardSubtext> : null}
		{children}
	</KpiCardContainer>;
};

// ——— section card ———
export const SectionCardContainer = styled(CardPanel)`
	padding : calc(var(--margin) / 2);
`;
export const SectionCardTitle = styled(CardPanelTitle)`
	margin-bottom : calc(var(--margin) / 3);
`;
export const SectionCardTitleBadge = styled.span.attrs({'data-widget': 'dqc-section-card-title-badge'})`
	display          : inline-flex;
	align-items      : center;
	justify-content  : center;
	min-width        : 20px;
	height           : 20px;
	padding          : 0 7px;
	margin-left      : 8px;
	font-size        : 0.75em;
	font-family      : var(--code-font-family);
	color            : var(--invert-color);
	background-color : var(--primary-color);
	border-radius    : 999px;
`;

export const SectionCard = (props: {
	title: ReactNode;
	badge?: ReactNode;
	children?: ReactNode;
}) => {
	const {title, badge, children} = props;
	return <SectionCardContainer>
		<SectionCardTitle>
			{title}
			{badge != null ? <SectionCardTitleBadge>{badge}</SectionCardTitleBadge> : null}
		</SectionCardTitle>
		{children}
	</SectionCardContainer>;
};

// ——— states ———
export const EmptyState = styled.div.attrs({'data-widget': 'dqc-empty-state'})`
	display         : flex;
	align-items     : center;
	justify-content : center;
	padding         : calc(var(--margin) / 2);
	opacity         : 0.6;
	font-variant    : petite-caps;
`;

const LoadingPulse = styled.div`
	@keyframes dqc-loading-pulse {
		0% { opacity : 0.35; }
		50% { opacity : 0.8; }
		100% { opacity : 0.35; }
	}
	animation : dqc-loading-pulse 1.2s ease-in-out infinite;
`;

const LoadingBar = styled(LoadingPulse).attrs<{ width?: string }>(({width = '100%'}) => {
	return {style: {width}};
})<{ width?: string }>`
	height           : 14px;
	border-radius    : var(--border-radius);
	background-color : var(--hover-color);
	margin           : 6px 0;
`;

export const LoadingRows = (props: { rows?: number }) => {
	const {rows = 4} = props;
	return <div data-widget="dqc-loading-rows">
		{Array.from({length: rows}).map((_, index) => {
			return <LoadingBar key={index} width={`${92 - index * 9}%`}/>;
		})}
	</div>;
};
