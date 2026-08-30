import styled from 'styled-components';

export const RunDialogForm = styled.div.attrs({'data-widget': 'run-rules-form'})`
	display               : grid;
	grid-template-columns : auto 1fr;
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
	align-items           : center;
	padding               : var(--margin) calc(var(--margin) / 2);
	min-width             : 460px;
	> div[data-widget=dropdown] {
		width : 100%;
	}
`;

export const RunDialogLabel = styled.div.attrs({'data-widget': 'run-rules-label'})`
	font-variant : petite-caps;
`;

export const RunDialogHint = styled.div.attrs({'data-widget': 'run-rules-hint'})`
	grid-column : 1 / 3;
	font-size   : 0.85em;
	color       : var(--font-color);
	opacity     : 0.6;
`;

export const RunResultsTable = styled.div.attrs({'data-widget': 'run-rules-results'})`
	display        : flex;
	flex-direction : column;
	width          : 100%;
	max-height     : calc(90vh - 220px);
	overflow-y     : auto;
`;

const RESULTS_COLUMNS = '40px 1fr 1fr 1fr 110px 170px';

const RunResultsGridRow = styled.div.attrs({'data-widget': 'run-rules-results-row'})`
	display               : grid;
	grid-template-columns : ${RESULTS_COLUMNS};
	grid-column-gap       : calc(var(--margin) / 2);
	align-items           : center;
	min-height            : var(--height);
	padding               : 0 calc(var(--margin) / 2);
`;

export const RunResultsHeaderRow = styled(RunResultsGridRow)`
	border-bottom : var(--border);
	font-variant  : petite-caps;
`;

export const RunResultsBodyRow = styled(RunResultsGridRow)`
	&:nth-child(even) {
		/* theme-neutral striping, same as pii/widgets.ts */
		background-color : rgba(128, 128, 128, 0.1);
	}
`;

export const RunResultsCell = styled.div.attrs({'data-widget': 'run-rules-results-cell'})`
	font-size     : 0.9em;
	white-space   : nowrap;
	overflow      : hidden;
	text-overflow : ellipsis;
	&[data-role=count] {
		text-align    : right;
		font-variant-numeric : tabular-nums;
	}
`;

export const RunResultsNoData = styled.div.attrs({'data-widget': 'run-rules-results-no-data'})`
	display     : flex;
	align-items : center;
	justify-content : center;
	min-height  : calc(var(--height) * 3);
	color       : var(--font-color);
	opacity     : 0.6;
`;
