import styled from 'styled-components';

export const NodeWrapper = styled.div.attrs({'data-widget': 'consanguinity-node-wrapper'})`
	display  : flex;
	position : relative;
	> div {
		flex-grow: 1;
	}
`;
export const NodeContainer = styled.div.attrs({'data-widget': 'consanguinity-node'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	align-self     : start;
	min-height     : calc(var(--height) * 2);
	border-radius  : calc(var(--height) / 2);
	padding        : calc(var(--margin) / 4) calc(var(--margin) / 2);
	box-shadow     : var(--consanguinity-node-shadow);
	overflow       : hidden;
	transition     : color 300ms ease-in-out, box-shadow 300ms ease-in-out;
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
	&[data-active=selected] {
		color      : var(--invert-color);
		box-shadow : var(--consanguinity-node-selected-shadow);
		&:before {
			background-color : var(--consanguinity-node-selected-bg-color);
		}
	}
	&[data-active=direct] {
		color      : var(--invert-color);
		box-shadow : var(--consanguinity-node-direct-shadow);
		&:before {
			background-color : var(--consanguinity-node-direct-bg-color);
		}
	}
	&[data-active=same-route] {
		color      : var(--invert-color);
		box-shadow : var(--consanguinity-node-same-route-shadow);
		&:before {
			background-color : var(--consanguinity-node-same-route-bg-color);
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
	text-align      : center;
`;
export const NodeItems = styled.div.attrs({'data-widget': 'consanguinity-node-items'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin         : calc(var(--margin) / 4) 0 calc(var(--margin) / 2) 0;
`;
export const NodeItem = styled.div.attrs({'data-widget': 'consanguinity-node-item'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	min-height   : var(--tall-height);
	font-variant : petite-caps;
	padding      : calc((var(--tall-height) - var(--line-height)) / 2) var(--input-indent);
	line-height  : var(--line-height);
	border       : var(--border);
	transition   : color 300ms ease-in-out, background-color 300ms ease-in-out, border-color 300ms ease-in-out;
	&:first-child {
		border-top-left-radius  : var(--border-radius);
		border-top-right-radius : var(--border-radius);
	}
	&:not(:first-child) {
		border-top-color : transparent;
	}
	&:last-child {
		border-bottom-left-radius  : var(--border-radius);
		border-bottom-right-radius : var(--border-radius);
	}
	&[data-active=selected] {
		color            : var(--invert-color);
		background-color : var(--consanguinity-node-selected-bg-color);
		border-color     : var(--consanguinity-node-selected-bg-color);
		&:not(:first-child) {
			border-top-color : transparent;
		}
	}
	&[data-active=direct] {
		color            : var(--invert-color);
		background-color : var(--consanguinity-node-direct-bg-color);
		border-color     : var(--consanguinity-node-direct-bg-color);
		&:not(:first-child) {
			border-top-color : transparent;
		}
	}
	&[data-active=same-route] {
		color            : var(--invert-color);
		background-color : var(--consanguinity-node-same-route-bg-color);
		border-color     : var(--consanguinity-node-same-route-bg-color);
		&:not(:first-child) {
			border-top-color : transparent;
		}
	}
`;
