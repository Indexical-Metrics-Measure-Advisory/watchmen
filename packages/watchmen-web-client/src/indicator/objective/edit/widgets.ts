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
`;
const ItemContainer = styled.div`
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
export const TimeFrameContainer = styled.div.attrs<{
	timeRelated: boolean; lastN: boolean; specifiedTill: boolean
}>(() => {
	return {
		'data-widget': 'objective-time-frame',
		style: {}
	};
})<{ timeRelated: boolean; lastN: boolean; specifiedTill: boolean }>`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	> div[data-widget=dropdown],
	> div[data-widget=calendar],
	> input {
		justify-self : start;
		width        : auto;
		min-width    : 200px;
	}
	> span:nth-child(3),
	> span:nth-child(5) {
		transition : opacity 300ms ease-in-out;
	}
	> span:nth-child(3),
	> div[data-widget=dropdown]:nth-child(4) {
		opacity        : ${({timeRelated, lastN}) => timeRelated && lastN ? (void 0) : 0};
		pointer-events : ${({timeRelated, lastN}) => timeRelated && lastN ? (void 0) : 'none'};
	}
	> span:nth-child(5) {
		grid-column : 1;
	}
	> span:nth-child(5),
	> div[data-widget=dropdown]:nth-child(6) {
		opacity        : ${({timeRelated}) => timeRelated ? (void 0) : 0};
		pointer-events : ${({timeRelated}) => timeRelated ? (void 0) : 'none'};
	}
	> span:nth-child(7),
	> div[data-widget=calendar]:nth-child(8) {
		opacity        : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? (void 0) : 0};
		pointer-events : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? (void 0) : 'none'};
	}
	> span:nth-child(9) {
		opacity        : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? 0.7 : 0};
		pointer-events : ${({timeRelated, specifiedTill}) => timeRelated && specifiedTill ? (void 0) : 'none'};
		grid-column    : span 2;
	}
	> span:nth-child(10) {
		grid-column : 1;
	}
`;
export const VariablesContainer = styled.div.attrs({'data-widget': 'objective-variables'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
`;
export const VariableContainer = styled(ItemContainer).attrs({'data-widget': 'objective-variable'})`
	grid-template-columns : 40px auto auto auto 1fr auto;
	> input:nth-child(2) {
		width : 200px;
	}
	> button:last-child {
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
export const VariableKindContainer = styled.div.attrs({'data-widget': 'objective-variable-kind'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	align-self       : center;
	justify-self     : start;
	font-variant     : petite-caps;
	font-weight      : var(--font-demi-bold);
	height           : calc(var(--height) - 2px);
	background-color : var(--param-bg-color);
	border-radius    : calc(var(--height) / 2 - 1px);
	box-shadow       : var(--param-border);
	cursor           : pointer;
	outline          : none;
	transition       : box-shadow 300ms ease-in-out;
	&:hover {
		box-shadow : var(--primary-hover-shadow);
	}
`;
export const VariableKindButton = styled.div.attrs<{ active: boolean, edit: boolean }>(({active, edit}) => {
	return {
		'data-widget': 'variable-kind-button',
		style: {
			display: (edit || active) ? (void 0) : 'none',
			backgroundColor: active ? (void 0) : 'var(--bg-color)',
			boxShadow: active ? (void 0) : 'var(--param-left-border)'
		}
	};
})<{ active: boolean, edit: boolean }>`
	display      : flex;
	align-items  : center;
	font-variant : petite-caps;
	font-weight  : var(--font-demi-bold);
	height       : calc(var(--height) - 2px);
	padding      : 0 calc(var(--margin) / 2);
	white-space  : nowrap;
	transition   : color 300ms ease-in-out;
	&:hover {
		color : ${({active}) => active ? (void 0) : 'var(--warn-color)'};
	}
`;
export const VariableKindIcon = styled.div.attrs({'data-widget': 'variable-kind-icon'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	padding         : 0 calc(var(--margin) / 2);
	width           : 20px;
	height          : 20px;
	&[data-expanded=true] {
		&:before {
			display : none;
		}
		> svg {
			transform  : rotateZ(180deg);
			transition : transform 300ms ease-in-out;
		}
	}
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 25%;
		left             : 0;
		width            : 1px;
		height           : 50%;
		background-color : var(--invert-color);
		opacity          : 0.5;
	}
	> svg {
		font-size : 0.8em;
	}
`;
export const VariableValuesContainer = styled.div.attrs({'data-widget': 'objective-variable-values'})`
	display  : flex;
	position : relative;
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
	> input:first-child:last-child {
		border-radius : calc(var(--height) / 2);
		padding       : 0 calc(var(--margin) / 2);
		width         : 100%;
	}
	> span:nth-child(3) {
		display          : flex;
		padding          : 0 calc(var(--margin) / 2);
		height           : var(--height);
		align-items      : center;
		font-variant     : petite-caps;
		font-weight      : var(--font-demi-bold);
		background-color : var(--border-color);
	}
	> button {
		background-color : var(--border-color);
		font-weight      : var(--font-bold);
		font-variant     : petite-caps;
	}
	> button:first-child {
		border-radius : calc(var(--height) / 2) 0 0 calc(var(--height) / 2);
	}
	> button:last-child {
		border-radius : 0 calc(var(--height) / 2) calc(var(--height) / 2) 0;
	}
	> input:not(:first-child) {
		border-radius : 0;
		border-left   : 0;
		border-right  : 0;
		flex-grow     : 1;
		~ input {
			border-left   : 0;
			border-right  : 0;
			padding-right : calc(var(--margin) / 2);
			flex-grow     : 1;
		}
	}
	> div[data-widget=dropdown]:first-child {
		border-radius : calc(var(--height) / 2) 0 0 calc(var(--height) / 2);
		border-right  : 0;
		+ div[data-widget=dropdown] {
			border-radius : 0 calc(var(--height) / 2) calc(var(--height) / 2) 0;
		}
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
export const IncorrectOptionLabel = styled.span.attrs({'data-widget': 'incorrect-option'})`
	color           : var(--danger-color);
	text-decoration : line-through;
`;
