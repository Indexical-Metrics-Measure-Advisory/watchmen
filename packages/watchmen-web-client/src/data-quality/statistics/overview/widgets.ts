import styled from 'styled-components';
import {CardPanel, CardPanelTitleRow, Pill, tintOf} from '../../widgets/kit';
import {NEUTRAL_COLOR, SEVERITY_COLORS} from '../../widgets/palette';

export const OverviewContainer = styled.div.attrs({'data-widget': 'quality-overview'})`
	display               : grid;
	grid-template-columns : repeat(4, 1fr);
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
	margin-bottom         : calc(var(--margin) / 2);
	@media (max-width: 1500px) {
		grid-template-columns : repeat(2, 1fr);
	}
`;

/** same chrome as the home cockpit cards, margin dropped for grid gaps */
export const OverviewCard = styled(CardPanel)`
	margin-bottom : 0;
	overflow      : hidden;
`;

export const OverviewCardHeader = CardPanelTitleRow;

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

/** severity pill: same look as the kit pill, tone derived from the severity prop */
export const SeverityBadge = styled(Pill).attrs<{ severity: string }>(({severity}) => {
	const color = SEVERITY_COLORS[severity] || NEUTRAL_COLOR;
	return {
		'data-widget': 'quality-overview-severity-badge',
		'data-severity': severity,
		style: {
			color,
			backgroundColor: tintOf(color, 0.12)
		}
	};
})<{ severity: string }>``;

export const SeverityCountDot = styled.span.attrs<{ severity: string }>(({severity}) => {
	return {
		'data-widget': 'quality-overview-severity-count-dot',
		'data-severity': severity,
		style: {backgroundColor: SEVERITY_COLORS[severity] || NEUTRAL_COLOR}
	};
})<{ severity: string }>`
	display       : inline-block;
	width         : 8px;
	height        : 8px;
	border-radius : 50%;
	margin-right  : 4px;
`;
