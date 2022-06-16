import styled from 'styled-components';

export const ObjectiveAnalysisBody = styled.div.attrs(() => {
	return {'data-widget': 'objective-analysis-body'};
})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr;
	width                 : 100%;
	min-height            : calc(100vh - var(--page-header-height));
	transition            : all 300ms ease-in-out;
`;
