import styled from 'styled-components';

export const TagManagementContainer = styled.div.attrs({'data-widget': 'tag-management-page'})`
	display        : flex;
	flex-direction  : column;
	height         : 100%;
	overflow        : hidden;
`;

export const TagListHeader = styled.div.attrs({'data-widget': 'tag-list-header'})`
	display               : grid;
	grid-template-columns : 40px 1fr 120px 1fr 120px;
	border-bottom         : 2px solid var(--border-color);
	height                : 40px;
	align-items           : center;
`;

export const TagListHeaderCell = styled.div.attrs({'data-widget': 'tag-list-header-cell'})`
	font-weight : 600;
	font-size   : 12px;
	padding     : 0 8px;
`;

export const TagRow = styled.div.attrs({'data-widget': 'tag-row'})`
	display               : grid;
	grid-template-columns : 40px 1fr 120px 1fr 120px;
	border-bottom         : 1px solid var(--border-color);
	align-items           : center;
	padding               : 8px 0;
	position              : relative;
`;

export const TagCell = styled.div.attrs({'data-widget': 'tag-cell'})`
	padding   : 0 8px;
	font-size : 14px;
`;

export const TagActionButtons = styled.div.attrs({'data-widget': 'tag-action-buttons'})`
	display : flex;
	gap     : 8px;
	padding : 0 8px;
`;
