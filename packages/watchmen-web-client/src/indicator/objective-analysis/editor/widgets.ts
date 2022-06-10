import styled from 'styled-components';

export const EditorContainer = styled.div.attrs({
	'data-v-scroll': '',
	'data-widget': 'objective-analysis-editor'
})`
	display    : flex;
	position   : relative;
	overflow-x : hidden;
	overflow-y : auto;
`;
export const NoDataPicked = styled.div.attrs({
	'data-widget': 'objective-analysis-unpicked'
})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	width           : 100%;
	font-family     : var(--title-font-family);
	font-size       : 2em;
	opacity         : 0.7;
`;
export const ObjectiveAnalysisCreateButton = styled.span.attrs({'data-widget': 'objective-analysis-create'})`
	text-decoration : underline;
	cursor          : pointer;
`;