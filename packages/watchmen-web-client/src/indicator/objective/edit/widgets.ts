import {Button} from '@/widgets/basic/button';
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
	font-size    : 1.1em;
	font-weight  : var(--font-demo-bold);
	font-variant : petite-caps;
`;
export const ItemValue = styled.span.attrs({'data-widget': 'objective-item-value'})`
	display     : flex;
	position    : relative;
	align-items : center;
	height      : var(--height);
	font-size   : 1.1em;
`;
export const ItemsButtons = styled.div.attrs({'data-widget': 'objective-buttons'})`
	display     : flex;
	position    : relative;
	align-items : center;
	margin-left : calc(40px + var(--margin) / 2);
	margin-top  : calc(var(--margin) / 2);
	> button[data-widget=objective-add-item] {
		margin-left : 0;
		:not(:first-child) {
			margin-top : 0;
		}
	}
	> button:first-child {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
	}
	> button:last-child {
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
	}
	> button:not(:first-child) {
		&:not(:last-child) {
			border-radius : 0;
		}
		&:before {
			content          : '';
			display          : block;
			position         : absolute;
			top              : 30%;
			left             : 0;
			width            : 1px;
			height           : 40%;
			background-color : var(--invert-color);
		}
	}
`;
export const AddItemButton = styled(Button).attrs({'data-widget': 'objective-add-item'})`
	margin-left   : calc(40px + var(--margin) / 2);
	justify-self  : start;
	border-radius : calc(var(--height) / 2);
	height        : var(--height);
	&:not(:first-child) {
		margin-top : calc(var(--margin) / 2);
	}
`;
export const RemoveItemButton = styled(Button).attrs({'data-widget': 'objective-remove-item'})`
	justify-self  : end;
	margin-right  : var(--margin);
	border-radius : calc(var(--height) / 2);
	height        : var(--height);
	&[data-as-icon=true] {
		padding       : 0;
		width         : var(--height);
		border-radius : 100%;
		&:before {
			content          : '';
			display          : block;
			position         : absolute;
			height           : 1px;
			width            : calc(var(--margin) / 2);
			top              : calc(var(--height) / 2);
			left             : calc(var(--margin) / -2);
			background-color : var(--border-color);
		}
	}
`;
export const ItemContainer = styled.div`
	display         : grid;
	position        : relative;
	grid-column-gap : calc(var(--margin) / 2);
	grid-row-gap    : calc(var(--margin) / 4);
	margin-left     : calc(var(--margin) / -2);
	padding         : 0 calc(var(--margin) / 2);
	> button:last-child {
		opacity        : 0;
		pointer-events : none;
	}
	&:hover {
		> button:last-child {
			opacity        : 1;
			pointer-events : auto;
		}
	}
`;
export const RibItemContainer = styled(ItemContainer)`
	&:before, &:after {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 0;
		left             : 0;
		width            : calc(100% - calc(var(--margin) / 2));
		height           : 100%;
		border-radius   : calc(var(--border-radius) * 2);
		background-color : transparent;
	}
	&:before {
		opacity    : 0.05;
		transition : background-color 300ms ease-in-out;
		z-index    : -2;
	}
	&:after {
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
	> button:last-child {
		opacity        : 0;
		pointer-events : none;
	}
`;
export const IncorrectOptionLabel = styled.span.attrs({'data-widget': 'incorrect-option'})`
	color           : var(--danger-color);
	text-decoration : line-through;
`;
