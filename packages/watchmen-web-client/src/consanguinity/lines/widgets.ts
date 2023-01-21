import styled from 'styled-components';
import {LineData} from './types';

export const ConsanguinityLinesContainer = styled.div.attrs({'data-widget': 'consanguinity-lines'})`
	display          : block;
	position         : absolute;
	background-color : transparent;
	top              : 0;
	left             : 0;
	width            : 100%;
	height           : 100%;
	pointer-events   : none;
`;
export const ConsanguinityLineContainer = styled.svg.attrs<{ rect: LineData }>(({rect}) => {
	return {
		'data-widget': 'consanguinity-line',
		width: `${rect.width}px`, height: `${rect.height}px`, version: '1.1', xmlns: 'http://www.w3.org/2000/svg',
		style: {
			top: rect.top,
			left: rect.left,
			width: rect.width,
			height: rect.height
		}
	};
})<{ rect: LineData }>`
	display  : block;
	position : absolute;
	&[data-active=selected] {
		z-index : 3;
		> path[data-type=start] {
			fill : var(--consanguinity-line-selected-color);
		}
		> path[data-type=line] {
			stroke : var(--consanguinity-line-selected-color);
		}
	}
	&[data-active=direct] {
		z-index : 2;
		> path[data-type=start] {
			fill : var(--consanguinity-line-direct-color);
		}
		> path[data-type=line] {
			stroke : var(--consanguinity-line-direct-color);
		}
	}
	&[data-active=same-route] {
		z-index : 1;
		> path[data-type=start] {
			fill : var(--consanguinity-line-same-route-color);
		}
		> path[data-type=line] {
			stroke : var(--consanguinity-line-same-route-color);
		}
	}
	> path[data-type=start] {
		fill           : var(--consanguinity-line-color);
		stroke         : transparent;
		stroke-width   : 1px;
		stroke-linecap : round;
		transition     : all 300ms ease-in-out;
	}
	> path[data-type=line] {
		fill           : transparent;
		stroke         : var(--consanguinity-line-color);
		stroke-width   : 2px;
		stroke-linecap : round;
		stroke-opacity : 0.9;
		transition     : all 300ms ease-in-out;
	}
`;
