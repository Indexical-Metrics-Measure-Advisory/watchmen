import styled from 'styled-components';
import {ItemContainer} from '../widgets';

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
			margin-left   : -1px;
		}
	}
`;