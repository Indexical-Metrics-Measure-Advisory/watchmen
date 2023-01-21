import styled from 'styled-components';

export const NodeContainer = styled.div.attrs({'data-widget': 'consanguinity-node'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	min-height     : calc(var(--height) * 2);
	border-radius  : calc(var(--height) / 2);
	padding        : calc(var(--margin) / 4) calc(var(--margin) / 2);
	box-shadow     : var(--consanguinity-node-shadow);
	overflow       : hidden;
	transition     : color 300ms ease-in-out;
	cursor         : pointer;
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 0;
		left             : 0;
		width            : 100%;
		height           : 100%;
		background-color : transparent;
		transition       : background-color 300ms ease-in-out;
	}
	&[data-selected=true] {
		color : var(--invert-color);
		&:before {
			background-color : var(--warn-color);
		}
	}
`;
export const NodeTitle = styled.div.attrs({'data-widget': 'consanguinity-node-title'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	font-variant    : petite-caps;
	font-weight     : var(--font-bold);
	min-height      : calc(var(--height) * 1.5);
`;
