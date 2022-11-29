import {Button} from '@/widgets/basic/button';
import {Input} from '@/widgets/basic/input';
import {InputLines} from '@/widgets/basic/input-lines';
import styled from 'styled-components';

export const ObjectiveContainer = styled.div.attrs({'data-widget': 'objective'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin-top     : var(--margin);
	padding-bottom : var(--margin);
`;
export const BackToListButtonContainer = styled.div.attrs({'data-widget': 'objective-back-to-list-button'})`
	display     : flex;
	margin-left : calc(var(--margin) / 2);
`;
export const TargetsContainer = styled.div.attrs({'data-widget': 'objective-targets'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
`;
export const TargetContainer = styled.div.attrs({'data-widget': 'objective-target'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 40px repeat(6, auto) 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	margin                : 0 calc(var(--margin) / -2);
	padding               : calc(var(--margin) / 2);
	&:before, &:after {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 0;
		left             : 0;
		width            : calc(100% - var(--margin));
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
	&:hover:after {
		border-color : var(--info-color);
		opacity      : 0.3;
	}
	&:nth-child(2n + 1) {
		&:before {
			background-color : var(--info-color);
		}
	}
	> input:nth-child(14n + 3) {
		max-width   : 600px;
		grid-column : 3 / span 6;
	}
	> span:nth-child(14n + 4),
	> span:nth-child(14n + 7),
	> span:nth-child(14n + 9) {
		grid-column : 2;
	}
	> input:nth-child(14n + 5) {
		max-width : 150px;
	}
	> span:nth-child(14n + 6) {
		grid-column : 4 / span 5;
		opacity     : 0.7;
	}
	> div:nth-child(14n + 12) {
		margin-right : var(--margin);
	}
	> div[data-widget=checkbox] {
		align-self : center;
	}
`;
export const ItemNo = styled.span.attrs({'data-widget': 'objective-item-no'})`
	display      : flex;
	align-items  : center;
	font-weight  : var(--font-bold);
	font-variant : petite-caps;
	opacity      : 0.7;
`;
export const ItemLabel = styled.span.attrs({'data-widget': 'objective-item-label'})`
	display      : flex;
	position     : relative;
	align-self   : center;
	font-weight  : var(--font-demo-bold);
	font-variant : petite-caps;
`;
export const SetTargetAsIsButton = styled(Button).attrs({'data-widget': 'objective-set-asis-target'})`
	justify-self : start;
`;
export const AddTargetButton = styled(Button).attrs({'data-widget': 'objective-add-target'})`
	margin-left  : calc(40px + var(--margin) / 2);
	justify-self : start;
	&:not(:first-child) {
		margin-top : calc(var(--margin) / 2);
	}
`;
export const TimeFrameContainer = styled.div.attrs({'data-widget': 'objective-time-frame'})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	> div[data-widget=dropdown],
	> div[data-widget=calendar],
	> input {
		justify-self : start;
		width        : auto;
		min-width    : 200px;
	}
`;
export const TimeFrameItemLabel = styled(ItemLabel)`
	transition : opacity 300ms ease-in-out;
	&[data-visible=false],
	&[data-visible=false] + input,
	&[data-visible=false] + div[data-widget=calendar] {
		opacity        : 0;
		pointer-events : none;
	}
`;
export const NameInput = styled(Input)`
	width       : calc(100% - var(--margin) / 2);
	height      : calc(var(--height) * 1.2);
	line-height : calc(var(--height) * 1.1);
	font-size   : 1.1em;
`;
export const DescriptionText = styled(InputLines)`
	width     : calc(100% - var(--margin) / 2);
	height    : calc(var(--height) * 5);
	font-size : 1.1em;
`;