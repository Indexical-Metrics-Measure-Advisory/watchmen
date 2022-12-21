import styled from 'styled-components';

export const JointContainer = styled.div.attrs({'data-widget': 'joint'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-auto-rows        : minmax(var(--height), auto);
	grid-row-gap          : calc(var(--margin) / 4);
`;
export const JointHeader = styled.div.attrs({'data-widget': 'joint-header'})`
	display : flex;
`;
