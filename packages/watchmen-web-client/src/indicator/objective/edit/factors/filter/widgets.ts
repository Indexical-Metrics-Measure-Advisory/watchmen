import styled from 'styled-components';

export const FilterContainer = styled.div.attrs({'data-widget': 'objective-factor-filter'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column           : 3 / span 2;
	margin-top            : calc((var(--height) - var(--param-height)) / 2);
	margin-left           : calc(var(--margin) / -2);
	margin-right          : calc(var(--margin) / 2);
`;
export const IndicatorNotReady = styled.div.attrs({'data-widget': 'objective-factor-filter-indicator-not-ready'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	justify-self     : start;
	font-variant     : petite-caps;
	background-color : var(--bg-color);
	padding          : 0 calc(var(--margin) / 2);
	height           : var(--param-height);
	width            : 300px;
	border-radius    : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
	box-shadow       : var(--param-border);
`;
export const FilterHeader = styled.div.attrs({'data-widget': 'objective-factor-filter-header'})`
	display : flex;
`;
