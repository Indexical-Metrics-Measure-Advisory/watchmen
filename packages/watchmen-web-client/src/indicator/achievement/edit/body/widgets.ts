import styled from 'styled-components';
import {AchievementRenderMode} from '../../achievement-event-bus-types';
import {CurveRect} from './types';

export const AchievementPaletteContainer = styled.div.attrs<{ renderMode: AchievementRenderMode }>(({renderMode}) => {
	return {
		'data-widget': 'achievement-palette-container',
		'data-v-scroll': renderMode === AchievementRenderMode.EDIT ? '' : (void 0),
		'data-h-scroll': renderMode === AchievementRenderMode.EDIT ? '' : (void 0),
		style: {
			overflow: renderMode === AchievementRenderMode.EDIT ? (void 0) : 'hidden'
		}
	};
})<{ renderMode: AchievementRenderMode }>`
	display          : flex;
	position         : relative;
	flex-grow        : 1;
	background-image : radial-gradient(var(--waive-color) 1px, transparent 0);
	background-size  : 48px 48px;
	overflow         : scroll;
`;

export const AchievementPalette = styled.div.attrs<{ showAddIndicator: boolean; renderMode: AchievementRenderMode }>(
	({showAddIndicator, renderMode}) => {
		return {
			'data-widget': 'achievement-palette',
			style: {
				paddingBottom: showAddIndicator ? (void 0) : (renderMode === AchievementRenderMode.VIEW ? 'var(--margin)' : 'calc(var(--margin) * 6)'),
				display: renderMode === AchievementRenderMode.VIEW ? 'flex' : (void 0),
				flexDirection: renderMode === AchievementRenderMode.VIEW ? 'column' : (void 0),
				width: renderMode === AchievementRenderMode.VIEW ? '100%' : (void 0)
			}
		};
	})<{ showAddIndicator: boolean; renderMode: AchievementRenderMode }>`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto auto;
	padding-bottom        : calc(var(--margin) * 2.5);
	${({renderMode}) => renderMode === AchievementRenderMode.VIEW ? `
	> div[data-widget=achievement-palette-column] {
		padding: var(--margin);
		&:first-child {
			flex-direction: unset;
			justify-content: center;
			padding-bottom: 0;
		}
		&:last-child {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			grid-column-gap: var(--margin);
			grid-row-gap: calc(var(--margin) / 2);
			width: 100%;
		}
		> div[data-widget="time-range-node-container"] {
			display: none
		}
		> div[data-widget=more-indicators-container] {
			display: none
		}
		> div[data-widget=achievement-root-node] {
			width: 100%;
			border: 0;
			font-size: calc(var(--font-size) * 1.6);
			font-weight: var(--font-bold);
			font-variant: petite-caps;
			transition: box-shadow 300ms ease-in-out;
			&:before {
				opacity: 0.05;
			}
			&:hover {
				box-shadow: var(--danger-shadow);
			}
			> div {
				height: calc(var(--tall-height) * 1.5);
				&:last-child:before, &:last-child:after {
					content: '〰〰〰';
					margin-right: calc(var(--margin) / 4);
					font-size: calc(var(--font-size) * 1.3);
					transform: translateY(2px);
				}
				&:last-child:after {
					margin-left: calc(var(--margin) / 4);
				}
			}
		}
		> div[data-widget=indicator-node-container] {
			flex-direction: column;
			border-radius: calc(var(--border-radius) * 2);
			box-shadow: var(--shadow);
			overflow: hidden;
			transition: box-shadow 300ms ease-in-out;
			&:hover {
				box-shadow: var(--hover-shadow);
			}
			> div[data-widget=indicator-node] {
				border: 0;
				border-bottom-left-radius: 0;
				border-bottom-right-radius: 0;
				width: 100%;
				justify-self: stretch;
				cursor: default;
				&:before {
					display: none;
				}
				&:hover {
					border-top-right-radius: calc(var(--border-radius) * 2);
				}
				> span:first-child {
					display: none;
				}
				> span:nth-child(2) {
					display: flex;
					position: relative;
					align-items: center;
					font-size: calc(var(--font-size) * 1.6);
					font-weight: var(--font-bold);
					font-variant: petite-caps;
					height: calc(var(--tall-height) * 1.5);
				}
				> span[data-widget=indicator-remover] {
					display: none
				}
				+ svg, + svg + span, + svg + span + div, + svg + span + div + span {
					display: none;
				}
			}
			> div[data-widget=indicator-calculation-node-container] {
				> div[data-widget=indicator-calculation-node] {
					border: 0;
					border-top-left-radius: 0;
					border-top-right-radius: 0;
					cursor: default;
					&:before {
						display: none;
					}
					> span:first-child, > span:nth-child(2), > span:last-child {
						display: none;
					}
				}
				> div[data-widget=indicator-calculation-formula] {
					display: none;
				}
			}
		}
		> div[data-widget=compute-indicator-node-container] {
			flex-direction: column;
			border-radius: calc(var(--border-radius) * 2);
			box-shadow: var(--shadow);
			overflow: hidden;
			transition: box-shadow 300ms ease-in-out;
			&:hover {
				box-shadow: var(--hover-shadow);
			}
			> div[data-widget=compute-indicator-node] {
				border: 0;
				width: 100%;
				justify-self: stretch;
				cursor: default;
				&:before {
					display: none;
				}
				> span:first-child {
					display: none;
				}
				> span:nth-child(2) {
					display: flex;
					position: relative;
					align-items: center;
					font-size: calc(var(--font-size) * 1.6);
					font-weight: var(--font-bold);
					font-variant: petite-caps;
					height: calc(var(--tall-height) * 1.5);
				}
				> span[data-widget=compute-indicator-remover] {
					display: none
				}
				+ svg, + svg + div, + svg + div + span {
					display: none;
				}
			}
			> div[data-widget=compute-indicator-calculation-node-container] {
				> div[data-widget=indicator-calculation-node] {
					border: 0;
					cursor: default;
					&:before {
						display: none;
					}
					> span:first-child, > span:nth-child(2), > span:last-child {
						display: none;
					}
				}
				> div[data-widget=compute-indicator-calculation-formula] {
					display: none;
				}
			}
		}
	}
	` : ''}
`;

export const PaletteColumn = styled.div.attrs({'data-widget': 'achievement-palette-column'})`
	display         : flex;
	position        : relative;
	flex-direction  : column;
	padding         : calc(var(--margin) * 2);
	align-items     : flex-start;
	justify-content : center;
`;

export const AchievementBlock = styled.div.attrs<{ error?: boolean; warn?: boolean }>(
	({error, warn}) => {
		return {
			'data-error': error ? 'true' : (void 0),
			'data-warn': warn ? 'true' : (void 0)
		};
	})<{ error?: boolean; warn?: boolean }>`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	min-height      : var(--header-height);
	min-width       : 150px;
	padding         : 0 var(--margin);
	border          : var(--border);
	border-width    : calc(var(--border-width) * 2);
	border-radius   : calc(var(--border-radius) * 2);
	border-color    : var(--primary-color);
	color           : var(--primary-color);
	font-size       : 1.2em;
	font-variant    : petite-caps;
	white-space     : nowrap;
	text-overflow   : ellipsis;
	overflow        : hidden;
	&[data-warn=true] {
		border-color : var(--warn-color);
		color        : var(--warn-color);
		&:before {
			background-color : var(--warn-color);
		}
		~ svg > g > path {
			stroke : var(--warn-color);
		}
	}
	&[data-error=true] {
		border-color : var(--danger-color);
		color        : var(--danger-color);
		&:before {
			background-color : var(--danger-color);
		}
		~ svg > g > path {
			stroke : var(--danger-color);
		}
	}
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 0;
		left             : 0;
		width            : 100%;
		height           : 100%;
		background-color : var(--primary-color);
		opacity          : 0.1;
		z-index          : -1;
	}
`;
export const AchievementBlockPairCurve = styled.svg.attrs<{ rect: CurveRect }>(({rect}) => {
	return {
		'xmlns': 'http://www.w3.org/2000/svg',
		style: {
			top: rect.top,
			left: 0 - rect.width,
			width: rect.width,
			height: rect.height
		}
	};
})<{ rect: CurveRect }>`
	display  : block;
	position : absolute;
	> g > path {
		stroke-width : 2px;
		fill         : transparent;
		opacity      : 0.5;
	}
`;
export const AchievementBlockPairLine = styled.span.attrs<{ error?: boolean; warn?: boolean }>(
	({error, warn}) => {
		return {
			'data-error': error ? 'true' : (void 0),
			'data-warn': warn ? 'true' : (void 0)
		};
	})<{ error?: boolean; warn?: boolean }>`
	&[data-warn=true] {
		background-color : var(--warn-color);
	}
	&[data-error=true] {
		background-color : var(--danger-color);
	}
`;

export const AchievementRootNode = styled(AchievementBlock).attrs({'data-widget': 'achievement-root-node'})`
	flex-direction : column;
	border-color   : var(--achievement-root-color);
	color          : var(--achievement-root-color);
	&:before {
		background-color : var(--achievement-root-color);
	}
	> div {
		display         : flex;
		position        : relative;
		align-items     : center;
		justify-content : center;
		min-height      : var(--height);
		width           : 100%;
		font-weight     : var(--font-bold);
	}
`;
export const IndicatorPartRelationLine = styled(AchievementBlockPairLine).attrs({'data-widget': 'indicator-part-relation-line'})`
	display          : block;
	position         : relative;
	width            : 64px;
	height           : 2px;
	background-color : var(--achievement-indicator-color);
	opacity          : 0.5;
`;
