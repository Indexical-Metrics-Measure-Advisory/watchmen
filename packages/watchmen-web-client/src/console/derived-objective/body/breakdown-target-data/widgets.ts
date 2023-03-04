import styled from 'styled-components';

export const BreakdownTargetDataContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-data'})`
	display      : block;
	position     : relative;
	border-left  : var(--border);
	padding-left : calc(var(--margin) / 2);
`;
export const BreakdownTargetDataNoDimension = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-no-dimension'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-weight  : var(--font-demi-bold);
	font-size    : 1.2em;
	font-variant : petite-caps;
	height       : var(--height);
	opacity      : 0.7;
`;
export const BreakdownTargetDataTable = styled.div.attrs({
	'data-widget': 'derived-objective-breakdown-target-data-table',
	'data-h-scroll': ''
})`
	display               : grid;
	position              : relative;
	align-items           : center;
	grid-template-columns : 1fr;
	overflow-x            : auto;
	overflow-y            : hidden;
`;
export const BreakdownTargetDataTableHeader = styled.div.attrs<{ columns: Array<string | number> }>(({columns}) => {
	return {
		'data-widget': 'derived-objective-breakdown-target-data-table-header',
		style: {
			gridTemplateColumns: columns.map(column => typeof column === 'number' ? `${column}px` : column).join(' ')
		}
	};
})<{ columns: Array<string | number> }>`
	display             : grid;
	position            : relative;
	align-items         : center;
	border-bottom       : var(--border);
	border-bottom-width : 2px;
`;
export const BreakdownTargetDataTableHeaderCell = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-data-table-header-cell'})`
	display       : grid;
	position      : relative;
	align-items   : center;
	font-weight   : var(--font-demi-bold);
	height        : var(--height);
	min-height    : var(--height);
	white-space   : nowrap;
	text-overflow : ellipsis;
	overflow      : hidden;
`;