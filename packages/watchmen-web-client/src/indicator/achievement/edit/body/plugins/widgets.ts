import styled from 'styled-components';
import {IndicatorNodeRemover} from '../indicator/widgets';
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
	&:before {
		background-color : var(--achievement-plugin-color);
	}
`;
export const PluginCurve = styled(AchievementBlockPairCurve).attrs<{ rect: CurveRect }>({
	'data-widget': 'plugin-curve'
})<{ rect: CurveRect }>`
	> g > path {
		stroke : var(--achievement-plugin-color);
	}
`;
export const PluginNodeContainer = styled.div.attrs({'data-widget': 'plugin-node-container'})`
	display  : flex;
	position : relative;
	&:not(:first-child) {
		margin-top : calc(var(--margin) / 2);
	}
	&:hover {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
		> span[data-widget=plugin-remover] {
			clip-path : polygon(0 0, 0 100%, calc(100% + 1px) 100%, calc(100% + 1px) 0);
		}
	}
`;
export const PluginNode = styled(AchievementBlock).attrs({'data-widget': 'plugin-node'})`
	justify-content : center;
	height          : var(--header-height);
	color           : var(--achievement-plugin-color);
	border-color    : var(--achievement-plugin-color);
	padding         : 0;
	&:before {
		background-color : var(--achievement-plugin-color);
	}
	> div[data-widget=dropdown] {
		border-color  : transparent;
		padding-left  : var(--margin);
		padding-right : var(--margin);
		height        : calc(100% - 4px);
		> div[data-widget=dropdown-options-container] {
			border-color : var(--achievement-plugin-color);
			font-size    : var(--font-size);
			margin-left  : -2px;
			> span[data-widget=dropdown-option] {
				padding-left  : calc(var(--margin) + 2px);
				padding-right : var(--margin);
			}
		}
	}
`;
export const PluginNodeRemover = styled(IndicatorNodeRemover).attrs({'data-widget': 'plugin-remover'})`
	//position          : relative;
	//left              : unset;
	border-color      : var(--achievement-plugin-color);
	border-left-color : transparent;
	transition        : border-radius 300ms ease-in-out, clip-path 300ms ease-in-out;
	&:before {
		background-color : var(--achievement-plugin-color);
	}
	> span {
		color        : var(--achievement-plugin-color);
		border-color : var(--achievement-plugin-color);
	}
`;
