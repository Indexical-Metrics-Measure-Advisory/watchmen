import styled from 'styled-components';

export const SpaceFilterContainer = styled.div.attrs({'data-widget': 'space-filter-edit'})`
	display        : flex;
	position       : relative;
	grid-column    : 1 / span 3;
	flex-grow      : 1;
	flex-direction : column;
	padding        : calc(var(--margin) / 2) var(--margin) calc(var(--margin) / 2) calc(var(--margin) / 2);
`;
