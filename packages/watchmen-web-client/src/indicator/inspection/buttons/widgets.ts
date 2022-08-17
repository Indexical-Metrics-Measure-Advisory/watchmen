import styled from 'styled-components';

export const ButtonsContainer = styled.div.attrs({'data-widget': 'inspection-buttons'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 250px auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	@media print {
		display : none;
	}
`;
