import styled from 'styled-components';

export const TargetsContainer = styled.div.attrs({'data-widget': 'derived-objective-targets'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, minmax(300px, 1fr));
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
`;
