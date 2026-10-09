import styled from 'styled-components';

export const SearchCriteriaContainer = styled.div.attrs({'data-widget': 'catalog-search'})`
	display               : grid;
	grid-template-columns : auto 1fr auto 1fr 1fr;
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 4);
	padding               : calc(var(--margin) / 2) var(--margin);
	margin-bottom         : calc(var(--margin) / 2);
	border                : var(--border);
	border-radius         : calc(var(--border-radius) * 3.5);
	background-color      : var(--invert-color);
	box-shadow            : 0 1px 2px rgba(37, 38, 94, 0.04), 0 6px 18px rgba(37, 38, 94, 0.06);
	align-items           : center;
`;
export const SearchLabel = styled.div.attrs({'data-widget': 'catalog-search-label'})`
	font-variant : petite-caps;
	&:nth-child(5) {
		grid-column : 1;
	}
`;
export const SearchCriteriaButtons = styled.div.attrs({'data-widget': 'catalog-search-buttons'})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 4);
`;
