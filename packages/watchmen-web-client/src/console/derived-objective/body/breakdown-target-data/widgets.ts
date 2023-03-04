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
	grid-column-gap     : calc(var(--margin) / 4);
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
export const BreakdownTargetDataTableBody = styled.div.attrs({
	'data-widget': 'derived-objective-breakdown-target-data-table-body',
	'data-v-scroll': ''
})`
	display               : grid;
	position              : relative;
	align-items           : center;
	grid-template-columns : 1fr;
	overflow-x            : hidden;
	overflow-y            : auto;
`;
export const BreakdownTargetDataTableRow = styled.div.attrs<{ columns: Array<string | number> }>(({columns}) => {
	return {
		'data-widget': 'derived-objective-breakdown-target-data-table-row',
		style: {
			gridTemplateColumns: columns.map(column => typeof column === 'number' ? `${column}px` : column).join(' ')
		}
	};
})<{ columns: Array<string | number> }>`
	display             : grid;
	position            : relative;
	align-items         : center;
	grid-column-gap     : calc(var(--margin) / 4);
	border-bottom       : var(--border);
	border-bottom-width : 1px;
	transition          : background-color 300ms ease-in-out;
	&:nth-child(2n + 1) {
		background-color : var(--grid-rib-bg-color);
	}
	&:hover {
		background-color : var(--hover-color);
	}
`;
export const BreakdownTargetDataTableRowCell = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-data-table-row-cell'})`
	display     : grid;
	position    : relative;
	align-items : center;
	height      : var(--height);
	min-height  : var(--height);
`;
