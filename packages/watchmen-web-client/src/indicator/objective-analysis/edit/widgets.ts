import {InputLines} from '@/widgets/basic/input-lines';
import styled from 'styled-components';
import {countLines} from './utils';

export const EditorContainer = styled.div.attrs({
	'data-widget': 'objective-analysis-editor'
})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	overflow       : hidden;
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
	height         : calc(100vh - var(--page-header-height));
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
export const AnalysisDescriptor = styled(InputLines).attrs(({value}) => {
	return {
		style: {
			height: `calc(${countLines(value as string ?? '')} * var(--line-height) + 12px)`
		}
	};
})`
	padding-left  : 2px;
	padding-right : 2px;
	border        : 0;
	border-radius : calc(var(--border-radius) * 2);
	font-size     : 1.3em;
	width         : 100%;
	overflow      : hidden;
`;
export const PerspectiveContainer = styled.div.attrs({
	'data-widget': 'object-analysis-perspective'
})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	&:hover {
		div[data-widget=objective-analysis-perspective-buttons] {
			opacity : 1;
		}
	}
	div[data-widget=achievement-palette-container] {
		margin-top       : calc(var(--margin) / 2);
		width            : 100%;
		background-image : none;
		overflow         : auto;
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
export const PerspectiveDescriptor = styled(InputLines).attrs(({value}) => {
	return {
		style: {
			height: `calc(${countLines(value as string ?? '')} * var(--line-height) + 12px)`
		}
	};
})`
	padding-left  : 2px;
	padding-right : 2px;
	border        : 0;
	border-radius : calc(var(--border-radius) * 2);
	font-size     : 1.3em;
	width         : 100%;
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