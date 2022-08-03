import styled from 'styled-components';
import {CurveRect} from '../types';
import {AchievementBlock, AchievementBlockPairCurve, PaletteColumn} from '../widgets';

export const PluginsContainer = styled.div.attrs({'data-widget': 'plugins-container'})`
	display   : flex;
	position  : relative;
	flex-wrap : nowrap;
	&:not(:first-child) {
		margin-top : calc(var(--margin) / 2);
	}
`;
export const PluginsRootColumn = styled(PaletteColumn).attrs({'data-widget': 'plugins-root-column'})`
	padding : 0 var(--margin);
	&:first-child {
		padding-left : 0;
	}
	&:last-child {
		padding-right : 0;
	}
`;
export const PluginsRootNodeContainer = styled.div.attrs({'data-widget': 'plugins-root-node-container'})`
	display  : block;
	position : relative;
`;
export const PluginsRootNode = styled(AchievementBlock).attrs({'data-widget': 'plugins-root-node'})`
	justify-content : center;
	height          : var(--header-height);
	color           : var(--achievement-plugin-color);
	border-color    : var(--achievement-plugin-color);
	cursor          : pointer;
	&:before {
		background-color : var(--achievement-plugin-color);
	}
	> svg {
		margin-left  : calc(var(--margin) / -4);
		margin-right : calc(var(--margin) / 2);
	}
`;
export const PluginsRootCurve = styled(AchievementBlockPairCurve).attrs<{ rect: CurveRect }>({
	'data-widget': 'plugins-root-curve'
})<{ rect: CurveRect }>`
	> g > path {
		stroke : var(--achievement-plugin-color);
	}
`;
