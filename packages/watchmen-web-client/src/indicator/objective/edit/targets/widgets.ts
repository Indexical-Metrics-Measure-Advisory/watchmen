import {Button} from '@/widgets/basic/button';
import styled from 'styled-components';
import {RibItemContainer} from '../widgets';

export const TargetsContainer = styled.div.attrs({'data-widget': 'objective-targets'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
`;
export const TargetContainer = styled(RibItemContainer).attrs({'data-widget': 'objective-target'})`
	grid-template-columns : 40px repeat(6, auto) 1fr;
	padding               : calc(var(--margin) / 2);
	> input:nth-child(3) {
		max-width   : 600px;
		grid-column : 3 / span 6;
	}
	> span:nth-child(4),
	> span:nth-child(7),
	> span:nth-child(9) {
		grid-column : 2;
	}
	> input:nth-child(5) {
		max-width : 150px;
	}
	> span:nth-child(6) {
		grid-column : 4 / span 5;
		opacity     : 0.7;
	}
	> div:nth-child(12) {
		margin-right : var(--margin);
	}
	> div[data-widget=checkbox] {
		align-self : center;
	}
`;
export const SetTargetAsIsButton = styled(Button).attrs({'data-widget': 'objective-set-asis-target'})`
	justify-self  : start;
	border-radius : calc(var(--height) / 2);
`;