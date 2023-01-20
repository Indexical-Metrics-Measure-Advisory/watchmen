import {LineData} from '@/consanguinity/lines/types';
import styled from 'styled-components';

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
			height: rect.height,
		}
	};
})<{ rect: LineData }>`
	display  : block;
	position : absolute;
	> path {
		fill           : transparent;
		stroke         : var(--primary-color);
		stroke-width   : 2px;
		stroke-linecap : round;
		stroke-opacity : 0.7;
	}
`;
