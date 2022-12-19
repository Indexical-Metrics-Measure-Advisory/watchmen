import {Button} from '@/widgets/basic/button';
import styled from 'styled-components';
import {ItemContainer} from '../widgets';

export const TargetsContainer = styled.div.attrs({'data-widget': 'objective-targets'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
`;
export const TargetContainer = styled(ItemContainer).attrs({'data-widget': 'objective-target'})`
	grid-template-columns : 40px repeat(6, auto) 1fr;
	padding               : calc(var(--margin) / 2);
	&:before, &:after {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 0;
		left             : 0;
		width            : calc(100% - calc(var(--margin) / 2));
		height           : 100%;
		background-color : transparent;
	}
	&:before {
		opacity    : 0.05;
		transition : background-color 300ms ease-in-out;
		z-index    : -2;
	}
	&:after {
		border-radius : calc(var(--border-radius) * 2);
		border-width  : 2px;
		border-color  : transparent;
		border-style  : dashed;
		opacity       : 0;
		transition    : all 300ms ease-in-out;
		z-index       : -1;
	}
	&:hover {
		&:after {
			border-color : var(--info-color);
			opacity      : 0.3;
		}
		> button:last-child {
			opacity        : 1;
			pointer-events : auto;
		}
	}
	&:nth-child(2n + 1):before {
		background-color : var(--info-color);
	}
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
	> button:last-child {
		opacity        : 0;
		pointer-events : none;
	}
`;
export const SetTargetAsIsButton = styled(Button).attrs({'data-widget': 'objective-set-asis-target'})`
	justify-self  : start;
	border-radius : calc(var(--height) / 2);
`;