import styled from 'styled-components';

export const JointElementsContainer = styled.div.attrs({'data-widget': 'joint-elements'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
	grid-auto-rows        : minmax(var(--height), auto);
	margin-left           : var(--margin);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		bottom           : 0;
		left             : calc(var(--margin) / -2);
		width            : 1px;
		height           : calc(100% + calc(var(--margin) / 4) + (var(--height) - var(--param-height)) / 2);
		background-color : transparent;
		border-left      : var(--border);
		z-index          : -1;
	}
`;
