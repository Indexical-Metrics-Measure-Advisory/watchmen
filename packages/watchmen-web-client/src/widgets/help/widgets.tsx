import styled from 'styled-components';
import {Button} from '../basic/button';
import {BASE_HEIGHT, HELP_Z_INDEX} from '../basic/constants';
import {Input} from '../basic/input';
import {DialogBody} from '../dialog/widgets';

// const AutoHide = keyframes`
// 	from {
// 		opacity : 1;
// 	}
// 	to {
// 		opacity        : 0;
// 		pointer-events : none;
// 	}
// `;
export const HelpContainer = styled.div.attrs<{ visible: boolean }>(({visible}) => {
	return {
		'data-widget': 'help',
		style: {
			transform: visible ? 'translateX(0)' : (void 0),
			pointerEvents: visible ? 'auto' : (void 0)
		}
	};
})<{ visible: boolean }>`
	display                   : flex;
	position                  : fixed;
	top                       : 0;
	right                     : 0;
	//margin-right              : -100%;
	height                    : ${BASE_HEIGHT}px;
	border-top-left-radius    : ${BASE_HEIGHT * 0.75}px;
	border-bottom-left-radius : ${BASE_HEIGHT * 0.75}px;
	border                    : var(--border);
	border-color              : var(--success-color);
	border-width              : calc(var(--border-width) * 2);
	color                     : var(--invert-color);
	background-color          : var(--success-color);
	pointer-events            : none;
	transform                 : translateX(100%);
	transition                : transform 300ms ease-in-out;
	cursor                    : pointer;
	z-index                   : ${HELP_Z_INDEX};
	user-select               : none;
	@media print {
		display: none;
	}
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
	height       : ${BASE_HEIGHT}px;
	margin-left  : calc(var(--margin) / 2);
	margin-right : calc(var(--margin) / 4);
	//font-size    : 1.4em;
	font-weight  : var(--font-bold);
`;
export const HelpIcon = styled.div.attrs({
	'data-widget': 'help-icon'
})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	height          : ${BASE_HEIGHT}px;
	width           : ${BASE_HEIGHT}px;
	> svg {
		width   : ${BASE_HEIGHT * 0.6}px;
		height  : ${BASE_HEIGHT * 0.6}px;
		opacity : 0.8;
	}
`;

export const HelpDialogBody = styled(DialogBody)`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	margin                : calc(var(--margin) * -1) calc(var(--margin) * -1) calc(var(--margin) / -2) calc(var(--margin) * -1);
	padding               : calc(var(--margin) / 2);
`;
export const HelpDialogSearchInput = styled(Input)`
	display       : flex;
	height        : calc(var(--height) * 2);
	margin-bottom : calc(var(--margin) / 2);
	font-size     : 2em;
	font-weight   : var(--font-bold);
	padding       : 0 calc(var(--input-indent) * 2);
	opacity       : 0.9;
`;
export const HelpDialogSearchResults = styled.div.attrs({
	'data-v-scroll': ''
})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	margin-bottom  : calc(var(--margin) / 2);
	max-height     : calc(80vh - 32px - 72px - 36px);
	overflow-x     : hidden;
	overflow-y     : auto;

`;
export const HelpDialogSearchResultItem = styled.div`
	display       : flex;
	position      : relative;
	align-items   : center;
	font-size     : 1.4em;
	padding       : 0 calc(var(--input-indent) * 2);
	border-bottom : var(--border);
	min-height    : calc(var(--height) * 1.5);
	cursor        : pointer;
	transition    : background-color 300ms ease-in-out, border-radius 300ms ease-in-out;
	&:hover {
		background-color : var(--hover-color);
		border-radius    : calc(var(--border-radius) * 2);
		> svg {
			color : var(--success-color);
		}
	}
	> span:first-child {
		flex-grow : 1;
	}
	> svg {
		opacity    : 0.7;
		transition : color 300ms ease-in-out;
	}
`;

export const HelpDialogButtons = styled.div`
	display : flex;
`;
export const HelpDialogVersionLabel = styled.div`
	display     : flex;
	position    : relative;
	flex-grow   : 1;
	align-items : center;
	opacity     : 0.5;
	font-weight : var(--font-bold);
`;
export const HelpDialogCloseButton = styled(Button)`
	min-width : 200px;
	height    : calc(var(--height) * 1.2);
	font-size : 1.4em;
`;
