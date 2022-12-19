import styled from 'styled-components';
import {ItemContainer} from '../widgets';

export const FactorsContainer = styled.div.attrs({'data-widget': 'objective-factors'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
`;
export const FactorContainer = styled(ItemContainer).attrs({'data-widget': 'objective-factor'})`
	grid-template-columns : 40px auto auto 1fr;
	> input:nth-child(2) {
		width : 400px;
	}
`;