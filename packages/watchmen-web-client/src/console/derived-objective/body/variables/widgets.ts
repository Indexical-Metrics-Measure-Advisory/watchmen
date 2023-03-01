import styled from 'styled-components';

export const VariablesContainer = styled.div.attrs({'data-widget': 'derived-objective-variables'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, minmax(300px, 1fr));
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
`;
