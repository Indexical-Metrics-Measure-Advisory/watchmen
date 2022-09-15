import styled from 'styled-components';
import {ItemBlock} from '../widgets';

export const AggregateItemContainer = styled.div.attrs({'data-widget': 'aggregate-item'})`
	display               : grid;
	grid-template-columns : 1fr;
	position              : relative;
	padding-right         : var(--margin);
`;
export const AggregateItemsBlock = styled.div.attrs({'data-widget': 'aggregate-items-block'})`
	display     : flex;
	position    : relative;
	flex-wrap   : wrap;
	margin-left : calc(var(--margin) / -2);
`;
export const AggregateItem = styled(ItemBlock).attrs({'data-widget': 'aggregate-item'})`
	cursor : pointer;
	&:after {
		background-color : var(--warn-color);
	}
	> svg {
		margin-left  : calc(var(--margin) / 4);
		margin-right : calc(var(--margin) / -8);
		height       : calc(var(--height) * 0.5);
		width        : calc(var(--height) * 0.5);
	}
`;