import styled from 'styled-components';

export const BreakdownTargetsContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-targets'})`
	display               : grid;
	position              : relative;
	grid-template-columns : minmax(300px, auto) 1fr;
	grid-column-gap       : var(--margin);
`;
