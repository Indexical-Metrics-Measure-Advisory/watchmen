import Color from 'color';
import styled from 'styled-components';
import {MonitorRuleSeverity} from '@/services/data/data-quality/rule-types';

export const OverviewContainer = styled.div.attrs({'data-widget': 'quality-overview'})`
	display               : grid;
	grid-template-columns : repeat(4, 1fr);
	grid-column-gap       : var(--margin);
	padding               : var(--margin) calc(var(--margin) / 2) 0;
	@media (max-width: 1500px) {
		grid-template-columns : repeat(2, 1fr);
		grid-row-gap          : var(--margin);
	}
`;

export const OverviewCard = styled.div.attrs({'data-widget': 'quality-overview-card'})`
	display        : flex;
	flex-direction : column;
	border         : var(--border);
	border-radius  : calc(var(--border-radius) * 2);
	overflow       : hidden;
	&:hover {
		box-shadow : var(--primary-hover-shadow);
	}
`;

export const OverviewCardHeader = styled.div.attrs({'data-widget': 'quality-overview-card-header'})`
	display         : flex;
	align-items     : center;
	justify-content : space-between;
	min-height      : var(--header-height);
	padding         : 0 calc(var(--margin) / 2);
	border-bottom   : var(--border);
	font-family     : var(--title-font-family);
	font-size       : 1.2em;
	white-space     : nowrap;
	overflow        : hidden;
`;

export const OverviewCardBody = styled.div.attrs({'data-widget': 'quality-overview-card-body'})`
	display    : flex;
	flex       : 1;
	position   : relative;
	min-height : 0;
`;

export const OverviewCardNoData = styled.div.attrs({'data-widget': 'quality-overview-card-no-data'})`
	display     : flex;
	flex        : 1;
	align-items : center;
	justify-content : center;
	color       : var(--font-color);
	opacity     : 0.6;
	font-size   : 0.9em;
`;

const SEVERITY_COLORS: Record<string, string> = {
	[MonitorRuleSeverity.FATAL]: '#d64545',
	[MonitorRuleSeverity.WARN]: '#d8901f',
	[MonitorRuleSeverity.TRACE]: '#4d6bfe'
};

export const SeverityBadge = styled.span.attrs<{ severity: string }>(({severity}) => {
	const color = SEVERITY_COLORS[severity] || '#7a7a7a';
	return {
		'data-widget': 'quality-overview-severity-badge',
		'data-severity': severity,
		style: {
			color,
			borderColor: Color(color).alpha(0.45).hex(),
			backgroundColor: Color(color).alpha(0.12).hex()
		}
	};
})<{ severity: string }>`
	display       : inline-flex;
	align-items   : center;
	border        : 1px solid;
	border-radius : calc(var(--border-radius) / 2);
	padding       : 0 calc(var(--margin) / 4);
	font-size     : 0.75em;
	text-transform: capitalize;
	white-space   : nowrap;
`;

export const SeverityCountDot = styled.span.attrs<{ severity: string }>(({severity}) => {
	return {
		'data-widget': 'quality-overview-severity-count-dot',
		'data-severity': severity,
		style: {backgroundColor: SEVERITY_COLORS[severity] || '#7a7a7a'}
	};
})<{ severity: string }>`
	display       : inline-block;
	width         : 8px;
	height        : 8px;
	border-radius : 50%;
	margin-right  : 4px;
`;
