import styled from 'styled-components';

export const ConsanguinityDiagram = styled.div.attrs({
	'data-widget': 'consanguinity',
	'data-v-scroll': '',
	'data-h-scroll': ''
})`
	display         : grid;
	position        : relative;
	flex-grow       : 1;
	grid-column-gap : calc(var(--margin) * 1.5);
	grid-row-gap    : calc(var(--margin) * 1.5);
`;
export const ConsanguinityBlockContainer = styled.div.attrs({'data-widget': 'consanguinity-block'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
`;
export const ConsanguinityBlockLabel = styled.div.attrs({'data-widget': 'consanguinity-block-label'})`
	display         : flex;
	position        : relative;
	font-size       : 1.2em;
	font-variant    : petite-caps;
	font-weight     : var(--font-bold);
	align-items     : center;
	justify-content : center;
	height          : calc(var(--height) * 1.5);
`;
export const ConsanguinityBlockBody = styled.div.attrs({'data-widget': 'consanguinity-block-body'})`
	display          : block;
	position         : relative;
	flex-grow        : 1;
	box-shadow       : var(--consanguinity-block-shadow);
	background-color : var(--consanguinity-block-bg-color);
	border-radius    : calc(var(--margin) / 2);
	border           : 0;
	min-width        : 300px;
	padding          : var(--margin);
`;