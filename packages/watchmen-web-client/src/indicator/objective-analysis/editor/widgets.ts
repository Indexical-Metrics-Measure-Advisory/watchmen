import styled from 'styled-components';

export const EditorContainer = styled.div.attrs({
	'data-v-scroll': '',
	'data-widget': 'objective-analysis-editor'
})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	overflow-x     : hidden;
	overflow-y     : auto;
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
		'data-widget': 'object-analysis-editor-header',
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
	div[data-widget=page-title-editor-label],
	input[data-widget=page-title-editor-input] {
		font-size : 2em;
		height    : calc(var(--margin) * 1.2);
	}
`;
export const EditorHeaderButtons = styled.div.attrs({
	'data-widget': 'object-analysis-editor-header-buttons'
})`
	display         : flex;
	position        : relative;
	padding         : 0 calc(var(--margin) / 2);
	align-items     : center;
	justify-content : flex-end;
`;