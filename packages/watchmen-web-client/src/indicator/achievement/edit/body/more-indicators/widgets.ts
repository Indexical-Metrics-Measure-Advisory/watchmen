import styled from 'styled-components';
import {CurveRect} from '../types';
import {AchievementBlock, AchievementBlockPairCurve, PaletteColumn} from '../widgets';

export const MoreIndicatorsContainer = styled.div.attrs({'data-widget': 'more-indicators-container'})`
	display   : flex;
	position  : relative;
	flex-wrap : nowrap;
	&:not(:first-child) {
		margin-top : calc(var(--margin) / 2);
	}
`;
export const MoreIndicatorsColumn = styled(PaletteColumn).attrs({'data-widget': 'more-indicators-column'})`
	padding : 0 var(--margin);
	&:first-child {
		padding-left : 0;
	}
	&:last-child {
		padding-right : 0;
	}
`;
export const MoreIndicatorsNodeContainer = styled.div.attrs({'data-widget': 'more-indicators-node-container'})`
	display  : block;
	position : relative;
`;
export const MoreIndicatorsNode = styled(AchievementBlock).attrs<{ showText: boolean }>(({showText}) => {
	return {
		'data-widget': 'more-indicators-node',
		style: {
			width: showText ? (void 0) : 'var(--header-height)',
			minWidth: showText ? (void 0) : 'var(--header-height)',
			padding: showText ? (void 0) : 0,
			borderRadius: showText ? (void 0) : '100%'
		}
	};
})<{ showText: boolean }>`
	justify-content : center;
	height          : var(--header-height);
	color           : var(--achievement-category-color);
	border-color    : var(--achievement-category-color);
	//font-size       : 1.4em;
	cursor          : pointer;
	&:before {
		background-color : var(--achievement-category-color);
	}
	${({showText}) => showText ? `
		> svg {
			margin-left  : calc(var(--margin) / -4);
			margin-right : calc(var(--margin) / 2);
		}
	` : ''}
`;
export const MoreIndicatorsCurve = styled(AchievementBlockPairCurve).attrs<{ rect: CurveRect }>({
	'data-widget': 'more-indicators-curve'
})<{ rect: CurveRect }>`
	> g > path {
		stroke : var(--achievement-category-color);
	}
`;
