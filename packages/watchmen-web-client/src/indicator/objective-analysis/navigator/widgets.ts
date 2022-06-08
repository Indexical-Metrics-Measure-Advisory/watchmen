import {Button} from '@/widgets/basic/button';
import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const NavigatorContainer = styled.div.attrs<{ visible: boolean }>(({visible}) => {
	return {
		'data-widget': 'objective-analysis-navigator',
		style: {
			marginLeft: visible ? 0 : (void 0)
		}
	};
})<{ visible: boolean }>`
	display        : flex;
	flex-direction : column;
	border-right   : var(--border);
	width          : 300px;
	margin-left    : -300px;
	transition     : margin-left 300ms ease-in-out;
`;

export const NavigatorHeader = styled.div.attrs({
	'data-widget': 'objective-analysis-navigator-header'
})`
	display       : flex;
	padding       : calc(var(--margin) / 4) calc(var(--margin) / 4) calc(var(--margin) / 4) calc(var(--margin) / 2);
	border-bottom : var(--border);
	overflow      : hidden;
	> button {
		padding : 0;
		width   : var(--margin);
		height  : var(--margin);
		&:last-child {
			margin-left : calc(var(--margin) / 4);
		}
	}
`;
export const NavigatorHeaderLabel = styled.div.attrs({
	'data-widget': 'objective-analysis-navigator-header-label'
})`
	display     : flex;
	flex-grow   : 1;
	align-items : center;
	font-family : var(--title-font-family);
	font-size   : 1.2em;
`;
export const NavigatorHeaderSearchInput = styled(Input).attrs<{ visible: boolean }>(({visible}) => {
	return {
		'data-widget': 'objective-analysis-navigator-header-search-input',
		style: {
			height: visible ? (void 0) : 0,
			marginTop: visible ? 0 : -1
		}
	};
})<{ visible: boolean }>`
	border-top-width   : 0;
	border-left-width  : 0;
	border-right-width : 0;
	border-radius      : 0;
	height             : calc(var(--tall-height) * 1.2);
	padding            : 0 calc(var(--margin) / 2);
	background-color   : var(--invert-color);
`;

export const ControlButton = styled(Button).attrs<{ visible: boolean }>(({visible}) => {
	return {
		'data-widget': 'objective-analysis-navigator-control-button',
		style: {
			left: visible ? 'calc(300px - var(--margin) * 6 / 4)' : 0,
			opacity: visible ? 0 : (void 0),
			pointerEvents: visible ? 'none' : (void 0)
		}
	};
})<{ visible: boolean }>`
	position      : absolute;
	height        : calc(var(--margin) * 5 / 4);
	width         : calc(var(--margin) * 5 / 4);
	top           : 0;
	margin-top    : calc(var(--margin) / 4);
	margin-left   : calc(var(--margin) / 4);
	border-radius : calc(var(--border-radius) * 2);
	font-size     : 1.5em;
	opacity       : 0.5;
	z-index       : 2;
	transition    : left 300ms ease-in-out, opacity 300ms ease-in-out;
	&:hover {
		opacity : 1;
	}
`;

export const LoadingLabel = styled.div.attrs({
	'data-widget': 'loading-label'
})`
	display      : flex;
	position     : relative;
	align-items  : center;
	padding      : 0 calc(var(--margin) / 2);
	font-variant : petite-caps;
	height       : calc(var(--tall-height) * 1.2);
	> svg {
		margin-right : calc(var(--margin) / 4);
	}
`;
export const NoDataLabel = styled.div.attrs({
	'data-widget': 'no-data-label'
})`
	display      : flex;
	position     : relative;
	align-items  : center;
	padding      : 0 calc(var(--margin) / 2);
	font-variant : petite-caps;
	height       : calc(var(--tall-height) * 1.2);
	> svg {
		margin-right : calc(var(--margin) / 4);
	}
`;

export const ObjectiveAnalysisItem = styled.div.attrs({
	'data-widget': 'objective-analysis-item'
})`
	display  : block;
	position : relative;
	padding  : calc(var(--margin) / 4) calc(var(--margin) / 2);
	cursor   : pointer;
	&:hover {
		background-color : var(--hover-color);
	}
	&:after {
		content          : '';
		display          : block;
		position         : absolute;
		bottom           : 0;
		left             : 0;
		width            : 100%;
		height           : 1px;
		background-color : var(--border-color);
		opacity          : 0.3;
	}
	> svg {
		margin-right : calc(var(--margin) / 4);
		opacity      : 0.5;
		color        : var(--info-color)
	}
	> span {
		word-break  : break-all;
		line-height : var(--line-height);
	}
`;