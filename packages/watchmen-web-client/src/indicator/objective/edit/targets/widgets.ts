import styled from 'styled-components';
import {ItemLabel, RibItemContainer} from '../widgets';

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
	> span:nth-child(9),
	> span:nth-child(15) {
		grid-column : 2;
	}
	> input:nth-child(5) {
		max-width : 150px;
	}
	> span:nth-child(6) {
		grid-column : 4 / span 5;
		opacity     : 0.7;
	}
	> span:nth-child(7) {
		align-self  : start;
		height      : var(--height);
		line-height : var(--height);
	}
	> div:nth-child(12) {
		margin-right : var(--margin);
	}
	> span:nth-child(15) {
		height      : var(--height);
		align-self  : start;
		align-items : center;
	}
	> div[data-widget=checkbox] {
		align-self : center;
	}
`;
export const AsIsContainer = styled.div.attrs({'data-widget': 'objective-as-is'})`
	display               : grid;
	position              : relative;
	grid-column           : 3 / span 6;
	grid-template-columns : auto 1fr;
	> div[data-widget=objective-computation] {
		grid-column : 2;
	}
`;
export const AsIsTypeContainer = styled.div.attrs({'data-widget': 'objective-as-is-type-edit'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	align-self       : start;
	justify-self     : start;
	font-variant     : petite-caps;
	font-weight      : var(--font-demi-bold);
	height           : var(--param-height);
	background-color : var(--param-bg-color);
	border-radius    : calc(var(--param-height) / 2) 0 0 calc(var(--param-height) / 2);
	margin-top       : calc(var(--height) / 2 - var(--param-height) / 2);
	box-shadow       : var(--param-border);
	cursor           : pointer;
	outline          : none;
	transition       : box-shadow 300ms ease-in-out;
	&:hover {
		box-shadow : var(--primary-hover-shadow);
	}
	+ div[data-widget=objective-computation] {
		> div[data-widget=objective-formula-operator] {
			border-top-left-radius    : 0;
			border-bottom-left-radius : 0;
		}
	}
	+ div[data-widget=parameter-factor-edit] {
		margin-left : 0;
		> div:first-child {
			border-top-left-radius    : 0;
			border-bottom-left-radius : 0;
		}
	}
`;
export const AsIsTypeButton = styled.div.attrs<{ active: boolean, edit: boolean }>(({active, edit}) => {
	return {
		'data-widget': 'objective-as-is-type-button',
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
	height       : var(--param-height);
	padding      : 0 calc(var(--margin) / 2);
	white-space  : nowrap;
	transition   : color 300ms ease-in-out;
	&:hover {
		color : ${({active}) => active ? (void 0) : 'var(--warn-color)'};
	}
`;
export const AsIsTypeIcon = styled.div.attrs({'data-widget': 'objective-as-is-type-icon'})`
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
export const Values = styled.div.attrs({'data-widget': 'objective-target-values'})`
	display               : grid;
	position              : relative;
	align-items           : center;
	grid-column           : span 5;
	grid-template-columns : auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	> span {
		height      : var(--height);
		align-items : center;
	}
	> span:first-child, > span:nth-child(3), > span:nth-child(5), > span:nth-child(9) {
		opacity : 0.7;
	}
	> span:nth-child(5), > span:nth-child(6), > span:nth-child(7), > span:nth-child(8) {
		grid-row : 2;
	}
	> span:nth-child(9), > span:nth-child(10), > span:nth-child(11), > span:nth-child(12) {
		grid-row : 3;
	}
`;
export const RatioLabel = styled(ItemLabel)`
	> svg {
		margin-left : calc(var(--margin) / 4);
	}
`