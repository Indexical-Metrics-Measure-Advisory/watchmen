import {InputLines} from '@/widgets/basic/input-lines';
import styled from 'styled-components';

export const EditorContainer = styled.div.attrs({
	'data-widget': 'objective-analysis-editor'
})`
	display        : flex;
	position       : relative;
	flex-direction : column;
`;
export const NoDataPicked = styled.div.attrs({
	'data-widget': 'objective-analysis-unpicked'
})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	width           : 100%;
	height          : 100%;
	font-family     : var(--title-font-family);
	font-size       : 2em;
	opacity         : 0.7;
`;
export const ObjectiveAnalysisCreateButton = styled.span.attrs({'data-widget': 'objective-analysis-create'})`
	text-decoration : underline;
	cursor          : pointer;
`;
export const EditorHeader = styled.div.attrs<{ navigatorVisible: boolean }>(({navigatorVisible}) => {
	return {
		'data-widget': 'objective-analysis-editor-header',
		style: {
			paddingLeft: navigatorVisible ? 0 : (void 0)
		}
	};
})<{ navigatorVisible: boolean }>`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr;
	align-items           : center;
	padding-left          : var(--margin);
	border-bottom         : var(--border);
	height                : calc(var(--margin) * 1.5 + 1px);
	transition            : padding-left 300ms ease-in-out;
	> div[data-widget=page-title-editor] {
		padding-left : calc(var(--margin) - var(--input-indent));
	}
	div[data-widget=page-title-editor-label],
	input[data-widget=page-title-editor-input] {
		font-size : 2em;
		height    : calc(var(--margin) * 1.2);
	}
`;
export const EditorHeaderButtons = styled.div.attrs({
	'data-widget': 'objective-analysis-editor-header-buttons'
})`
	display         : flex;
	position        : relative;
	padding         : 0 var(--margin) 0 calc(var(--margin) / 2);
	align-items     : center;
	justify-content : flex-end;
	> button:first-child {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
	}
	> button:nth-child(2) {
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
		&:after {
			content          : '';
			display          : block;
			position         : absolute;
			top              : 30%;
			left             : -0.5px;
			width            : 1px;
			height           : 40%;
			background-color : var(--bg-color);
		}
	}
	> button:last-child {
		margin-left : calc(var(--margin) / 2);
	}
`;
export const EditorBody = styled.div.attrs({
	'data-v-scroll': '',
	'data-widget': 'objective-analysis-editor-body'
})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	padding        : calc(var(--margin) / 2) var(--margin) var(--margin);
	overflow       : auto;
	height         : calc(100vh - var(--page-header-height) - var(--margin) * 1.5 - 1px);
`;
export const AnalysisDescriptorWrapper = styled.div.attrs({
	'data-widget': 'objective-analysis-descriptor-wrapper'
})`
	display  : flex;
	position : relative;
	width    : 100%;
	padding  : calc(var(--margin) / 4) 0;
	> svg {
		margin-top   : 6px;
		margin-right : calc(var(--margin) / 2);
		height       : var(--line-height);
		width        : var(--line-height);
		color        : var(--success-color);
		opacity      : 0.8;
	}
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		bottom           : 0;
		left             : 0;
		width            : 100%;
		height           : 4px;
		border-radius    : 2px;
		background-color : var(--primary-color);
		opacity          : 0.1;
		z-index          : -1;
	}
`;
export const AnalysisDescriptor = styled(InputLines)`
	padding-left  : 2px;
	padding-right : 2px;
	border        : 0;
	border-radius : calc(var(--border-radius) * 2);
	font-size     : 1.3em;
	width         : 100%;
	height        : calc(var(--line-height) + 12px);
	overflow      : hidden;
`;
export const PerspectiveContainer = styled.div.attrs({
	'data-widget': 'object-analysis-perspective'
})`
	display        : flex;
	flex-direction : column;
	&:hover {
		div[data-widget=objective-analysis-perspective-buttons] {
			opacity : 1;
		}
	}
`;
export const PerspectiveDescriptorWrapper = styled.div.attrs({
	'data-widget': 'objective-analysis-perspective-descriptor-wrapper'
})`
	display    : flex;
	position   : relative;
	width      : 100%;
	padding    : calc(var(--margin) / 4) 0;
	margin-top : var(--margin);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		bottom           : 0;
		left             : 0;
		width            : 100%;
		height           : 4px;
		border-radius    : 2px;
		background-color : var(--primary-color);
		opacity          : 0.1;
		z-index          : -1;
	}
	> svg {
		margin-top   : 6px;
		margin-right : calc(var(--margin) / 2);
		height       : var(--line-height);
		width        : var(--line-height);
		color        : var(--info-color);
		opacity      : 0.8;
	}
`;
export const PerspectiveDescriptor = styled(InputLines)`
	padding-left  : 2px;
	padding-right : 2px;
	border        : 0;
	border-radius : calc(var(--border-radius) * 2);
	font-size     : 1.3em;
	width         : 100%;
	height        : calc(var(--line-height) + 12px);
	overflow      : hidden;
`;
export const PerspectiveButtons = styled.div.attrs({
	'data-widget': 'objective-analysis-perspective-buttons'
})`
	display         : flex;
	position        : relative;
	padding         : 0 0 6px calc(var(--margin) / 2);
	align-items     : center;
	align-self      : flex-end;
	justify-content : flex-end;
	opacity         : 0;
	transition      : opacity 300ms ease-in-out;
`;