import styled, {keyframes} from 'styled-components';
import {BASE_HEIGHT, BASE_MARGIN, HELP_Z_INDEX} from '../basic/constants';

const AutoHide = keyframes`
	from {
		opacity : 1;
	}
	to {
		opacity        : 0;
		pointer-events : none;
	}
`;
export const HelpContainer = styled.div.attrs<{ visible: boolean }>(({visible}) => {
	return {
		'data-widget': 'help',
		style: {
			opacity: visible ? 1 : (void 0),
			pointerEvents: visible ? 'auto' : (void 0),
			animation: visible ? (void 0) : 'none'
		}
	};
})<{ visible: boolean }>`
	display          : flex;
	position         : fixed;
	top              : ${BASE_MARGIN}px;
	right            : ${BASE_MARGIN}px;
	height           : ${BASE_HEIGHT * 1.5}px;
	border-radius    : ${BASE_HEIGHT * 0.75}px;
	border           : var(--border);
	border-color     : var(--success-color);
	border-width     : calc(var(--border-width) * 2);
	color            : var(--invert-color);
	background-color : var(--success-color);
	opacity          : 0;
	pointer-events   : none;
	transition       : all 300ms ease-in-out;
	animation        : ${AutoHide} 300ms ease-in-out 10s forwards;
	cursor           : pointer;
	z-index          : ${HELP_Z_INDEX};
	user-select      : none;
	> * {
		margin-top : -2px;
	}
`;
export const HelpLabel = styled.div.attrs({
	'data-widget': 'help-label'
})`
	display      : flex;
	position     : relative;
	align-items  : center;
	height       : ${BASE_HEIGHT * 1.5}px;
	margin-left  : calc(var(--margin) / 2);
	margin-right : calc(var(--margin) / 4);
	font-size    : 1.4em;
	font-weight  : var(--font-bold);
`;
export const HelpIcon = styled.div.attrs({
	'data-widget': 'help-icon'
})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	height          : ${BASE_HEIGHT * 1.5}px;
	width           : ${BASE_HEIGHT * 1.5}px;
	> svg {
		width   : ${BASE_HEIGHT}px;
		height  : ${BASE_HEIGHT}px;
		opacity : 0.8;
	}
`;