import styled from 'styled-components';

export const ExpressionContainer = styled.div.attrs({'data-widget': 'expression'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-auto-rows        : minmax(var(--height), auto);
	grid-row-gap          : calc(var(--margin) / 4);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : calc(var(--height) / 2);
		left             : calc(var(--margin) / -2);
		width            : calc(var(--margin) / 2);
		height           : 1px;
		background-color : var(--border-color);
		z-index          : -1;
	}
`;
export const ExpressionHeader = styled.div.attrs({'data-widget': 'expression-header'})`
	display : flex;
	~ div {
		margin-left : var(--margin);
	}
`;
export const ExpressionLeadLabel = styled.div.attrs({'data-widget': 'expression-lead-label'})`
	display          : flex;
	position         : relative;
	align-self       : center;
	align-items      : center;
	justify-self     : start;
	height           : var(--param-height);
	font-variant     : petite-caps;
	font-weight      : var(--font-demi-bold);
	background-color : var(--param-bg-color);
	border-radius    : calc(var(--param-height) / 2);
	padding          : 0 calc(var(--margin) / 2);
	cursor           : default;
	outline          : none;
	box-shadow       : var(--param-border);
`;
export const ExpressionSideContainer = styled.div.attrs({'data-widget': 'expression-side'})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr;
	grid-auto-rows        : minmax(var(--height), auto);
	grid-row-gap          : calc(var(--margin) / 4);
	&:before {
		content       : '';
		display       : block;
		position      : absolute;
		top           : calc(var(--height) / -2);
		left          : calc(var(--margin) / -2);
		width         : calc(var(--margin) / 2);
		height        : var(--height);
		border-left   : var(--border);
		border-bottom : var(--border);
		z-index       : -1;
	}
	&:last-child:before {
		border-bottom-left-radius : var(--border-radius);
	}
	&:not(:last-child) {
		:after {
			content          : '';
			display          : block;
			position         : absolute;
			top              : calc(var(--height) / 2);
			left             : calc(var(--margin) / -2);
			width            : 1px;
			height           : calc(100% - var(--height) / 2);
			background-color : var(--border-color);
			z-index          : -1;
		}
	}
`;