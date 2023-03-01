import styled from 'styled-components';

export const VariablesContainer = styled.div.attrs({'data-widget': 'derived-objective-variables'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, 120px 1fr);
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
`;
export const VariableName = styled.div.attrs({'data-widget': 'derived-objective-variable-name'})`
	display       : flex;
	position      : relative;
	grid-column   : span 3;
	align-items   : center;
	font-size     : 1.4em;
	font-weight   : var(--font-bold);
	font-variant  : petite-caps;
	min-height    : var(--tall-height);
	margin-bottom : calc(var(--margin) / 2);
	opacity       : 0.8;
`;

