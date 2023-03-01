import styled from 'styled-components';

export const VariablesContainer = styled.div.attrs({'data-widget': 'derived-objective-variables'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, 150px 1fr);
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
	margin-bottom         : var(--margin);
	transition            : height 300ms ease-in-out;
	&[data-visible=false] {
		height        : 0;
		margin-bottom : 0;
		overflow      : hidden;
	}
`;
export const VariablesTitle = styled.div.attrs({'data-widget': 'derived-objective-variables-title'})`
	display       : flex;
	position      : relative;
	grid-column   : span 6;
	align-items   : center;
	font-size     : 1.4em;
	font-weight   : var(--font-bold);
	font-variant  : petite-caps;
	min-height    : var(--tall-height);
	opacity       : 0.8;
`;
export const VariableName = styled.div.attrs({'data-widget': 'derived-objective-variable-name'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-variant : petite-caps;
	opacity      : 0.8;
`;
