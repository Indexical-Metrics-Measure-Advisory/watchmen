import {Button} from '@/widgets/basic/button';
import styled from 'styled-components';

export const DefContainer = styled.div.attrs({
	'data-widget': 'convergence-def-container',
	'data-v-scroll': '',
	'data-h-scroll': ''
})`
	display      : block;
	position     : relative;
	overflow     : auto;
	margin-left  : calc(var(--margin) * -1);
	padding-left : var(--margin);
	margin-right : calc(var(--margin) / 2);
`;
export const AxisEditGridContainer = styled.div.attrs<{ yCount: number; xCount: number }>(
	({yCount}) => {
		return {
			'data-widget': 'convergence-def-grid',
			style: {
				gridTemplateColumns: `minmax(200px, auto) ${new Array(yCount - 1).fill('auto').join(' ')} 1fr`
			}
		};
	})<{ yCount: number; xCount: number }>`
	display               : grid;
	position              : relative;
	grid-template-columns : minmax(200px, auto) 1fr;
	> div[data-widget=convergence-def-lead-corner] ~ div[data-widget=convergence-def-y-axis] + div[data-widget=convergence-def-targets] {
		grid-column : ${({yCount}) => yCount + 1};
		grid-row    : ${({xCount}) => xCount + 1};
	}
`;
export const ObjectiveEditGridContainer = styled.div.attrs<{
	yCount: number; xCount: number;
	xComputedCount: number; yComputedCount: number
}>(
	({yCount, xCount, xComputedCount, yComputedCount}) => {
		return {
			'data-widget': 'convergence-def-grid',
			style: {
				gridTemplateRows: `${xCount === 0 ? 'minmax(var(--tall-height), auto)' : new Array(xCount).fill('auto').join(' ')} ${new Array(yComputedCount).fill('1fr').join(' ')}`,
				gridTemplateColumns: `${yCount === 0 ? 'minmax(200px, auto)' : new Array(yCount).fill('auto').join(' ')} ${new Array(xComputedCount).fill('1fr').join(' ')}`
			}
		};
	})<{ yCount: number; xCount: number; xComputedCount: number; yComputedCount: number }>`
	display  : grid;
	position : relative;
`;
export const LeadCorner = styled.div.attrs<{ yCount: number; xCount: number }>(
	({yCount, xCount}) => {
		return {
			'data-widget': 'convergence-def-lead-corner',
			style: {
				gridRow: `1 / span ${xCount}`,
				gridColumn: `1 / span ${yCount}`
			}
		};
	}
)<{ yCount: number; xCount: number }>`
	display                : flex;
	position               : relative;
	align-items            : center;
	justify-content        : center;
	border                 : var(--border);
	border-top-left-radius : var(--border-radius);
	min-height             : var(--tall-height);
	border-right           : 0;
	border-bottom          : 0;
	padding                : calc(var(--margin) / 2);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 0;
		left             : 0;
		width            : 100%;
		height           : 100%;
		background-color : var(--border-color);
		z-index          : -1;
		opacity          : 0.3;
	}
	> button {
		height     : 100%;
		min-height : var(--height);
	}
`;
export const XAxis = styled.div.attrs({'data-widget': 'convergence-def-x-axis'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	border          : var(--border);
	border-bottom   : 0;
	min-height      : calc(var(--tall-height) * 1.5);
	padding         : 0 calc(var(--margin) / 2) 0 calc(var(--margin) / 2 - var(--input-indent));
	&:nth-child(2) {
		border-top-right-radius : var(--border-radius);
	}
	& + div[data-widget=convergence-def-y-axis] {
		border-bottom-left-radius : var(--border-radius);
	}
	&:focus-within {
		> div[data-widget=dropdown]:first-child:last-child {
			border-color : var(--border-color);
		}
	}
	> div[data-widget=dropdown]:first-child:last-child {
		border-color : transparent;
		width        : auto;
	}
`;
export const XAxisLegendCellContainer = styled(XAxis)`
	display               : grid;
	grid-template-columns : auto 150px 1fr auto;
	grid-column-gap       : calc(var(--margin) / 2);
	padding               : 0 calc(var(--margin) / 2);
`;
export const XAxisFrozenLegendCellContainer = styled.div.attrs<{
	row: number; column: number; span?: number; last: boolean
}>(
	({row, column, span, last}) => {
		return {
			'data-widget': 'convergence-def-x-axis',
			style: {
				gridRow: row + 1,
				gridColumn: span == null ? column : `${column} / span ${span}`,
				borderTopRightRadius: (row === 0 && last) ? 'var(--border-radius)' : (void 0),
				borderRight: last ? 'var(--border)' : (void 0)
			}
		};
	})<{ row: number; column: number; span?: number; last: boolean }>`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	border          : var(--border);
	border-right    : 0;
	border-bottom   : 0;
	min-height      : calc(var(--tall-height) * 1.5);
	padding         : 0 calc(var(--margin) / 2);
`;
export const XVariableContent = styled.div.attrs<{ columns: number }>(
	({columns}) => {
		return {
			'data-widget': 'convergence-def-x-axis-variable-content',
			style: {
				gridTemplateColumns: Array(columns).fill('auto 1fr').join(' ')
			}

		};
	})<{ columns: number }>`
	display         : grid;
	position        : relative;
	grid-column-gap : calc(var(--margin) / 2);
	align-items     : center;
`;
export const XRemoveMeButton = styled.div.attrs({'data-widget': 'remove-me-button'})`
	display         : flex;
	position        : relative;
	align-self      : center;
	align-items     : center;
	justify-content : center;
	width           : var(--height);
	height          : var(--height);
	border-radius   : calc(var(--border-radius) * 2);
	border          : var(--border);
	cursor          : pointer;
	transition      : box-shadow 300ms ease-in-out, color 300ms ease-in-out, border-color 300ms ease-in-out;
	&:hover {
		color        : var(--danger-color);
		opacity      : 1;
		border-color : var(--danger-color);
		box-shadow   : var(--danger-hover-shadow);
	}
`;
export const YAxis = styled.div.attrs({'data-widget': 'convergence-def-y-axis'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	border          : var(--border);
	border-right    : 0;
	min-height      : var(--tall-height);
	padding         : calc(var(--margin) / 2);
	&:focus-within {
		> div[data-widget=dropdown]:first-child:last-child {
			border-color : var(--border-color);
		}
	}
	> div[data-widget=dropdown]:first-child:last-child {
		border-color : transparent;
	}
`;
export const YAxisLegendCellContainer = styled(YAxis)`
	display               : grid;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
	align-content         : start;
`;
export const YAxisFrozenLegendCellContainer = styled.div.attrs<{
	row: number; column: number; span?: number; last: boolean
}>(
	({row, column, span, last}) => {
		return {
			'data-widget': 'convergence-def-y-axis',
			style: {
				gridColumn: column + 1,
				gridRow: span == null ? row : `${row} / span ${span}`,
				borderBottomLeftRadius: (column === 0 && last) ? 'var(--border-radius)' : (void 0),
				borderBottom: last ? 'var(--border)' : (void 0)
			}
		};
	})<{ row: number; column: number; span?: number; last: boolean }>`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	border          : var(--border);
	border-right    : 0;
	border-bottom   : 0;
	min-height      : var(--tall-height);
	padding         : calc(var(--margin) / 2);
`;
export const YVariableContent = styled.div.attrs({'data-widget': 'convergence-def-x-axis-variable-content'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
	align-items           : center;
`;
export const YRemoveMeButton = styled.div.attrs({'data-widget': 'remove-me-button'})`
	display         : flex;
	position        : relative;
	align-self      : center;
	align-items     : center;
	justify-content : center;
	width           : 100%;
	height          : var(--height);
	border-radius   : calc(var(--border-radius) * 2);
	border          : var(--border);
	cursor          : pointer;
	transition      : box-shadow 300ms ease-in-out, color 300ms ease-in-out, border-color 300ms ease-in-out;
	&:hover {
		color        : var(--danger-color);
		opacity      : 1;
		border-color : var(--danger-color);
		box-shadow   : var(--danger-hover-shadow);
	}
`;
export const TargetsGrid = styled.div.attrs({'data-widget': 'convergence-def-targets'})`
	display                    : flex;
	position                   : relative;
	align-items                : center;
	justify-content            : center;
	border                     : var(--border);
	border-bottom-right-radius : var(--border-radius);
	min-height                 : var(--tall-height);
`;
export const TargetCell = styled.div.attrs<{
	row: number; column: number; lastRow: boolean; lastColumn: boolean
}>(({row, column, lastRow, lastColumn}) => {
	return {
		'data-widget': 'convergence-def-target',
		style: {
			gridRow: row,
			gridColumn: column,
			borderRight: lastColumn ? 'var(--border)' : (void 0),
			borderBottom: lastRow ? 'var(--border)' : (void 0),
			borderBottomRightRadius: (lastRow && lastColumn) ? 'var(--border-radius)' : (void 0)
		}
	};
})<{ row: number; column: number; lastRow: boolean; lastColumn: boolean }>`
	display               : grid;
	position              : relative;
	align-items           : center;
	align-content         : start;
	grid-template-columns : auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	border-top            : var(--border);
	border-left           : var(--border);
	min-height            : var(--tall-height);
	padding               : calc(var(--margin) / 2);
	> div[data-widget=dropdown]:first-child {
		grid-column   : span 4;
		margin-bottom : calc(var(--margin) / 4);
	}
	> div[data-widget=dropdown]:not(:first-child) {
		min-width : 150px;
	}
	> span:nth-child(3),
	> span:nth-child(4n) {
		display         : flex;
		position        : relative;
		align-items     : center;
		justify-content : center;
		min-height      : var(--height);
	}
	> span:nth-child(3) {
		justify-content : start;
	}
	> span:nth-child(3),
	> span:nth-child(4n + 1) {
		font-weight  : var(--font-demi-bold);
		font-variant : petite-caps;
		white-space  : nowrap;
	}
`;
export const FreezeButton = styled(Button)`
	min-width : 200px;
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		width            : 100%;
		height           : 100%;
		background-color : var(--border-color);
		z-index          : -1;
		opacity          : 0.3;
	}
`;
export const AskValuesButton = styled(Button)`
	margin-top    : var(--margin);
	border-radius : calc(var(--height) / 2);
`;
export const ValuesGridContainer = styled.div.attrs<{ rows: number; columns: number }>(
	({rows, columns}) => {
		return {
			'data-widget': 'convergence-values-grid',
			style: {
				gridTemplateColumns: rows === 0
					? `${new Array(columns).fill('auto').join(' ')}`
					: `auto ${new Array(columns).fill('auto').join(' ')}`
			}
		};
	})<{ rows: number; columns: number }>`
	display  : grid;
	position : relative;
`;
export const ValueColumnHeader = styled.div.attrs<{ row: number; column: number; columns: number; last: boolean }>(
	({row, column, columns, last}) => {
		return {
			'data-widget': 'convergence-values-grid-column-header',
			style: {
				gridRow: row,
				gridColumn: `${column} / span ${columns}`,
				borderRight: last ? 'var(--border)' : (void 0),
				borderTopRightRadius: (row === 1 && last) ? 'var(--border-radius)' : (void 0)
			}
		};
	})<{ row: number; column: number; columns: number; last: boolean }>`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	padding         : calc(var(--margin) / 2);
	border-top      : var(--border);
	border-left     : var(--border);
`;
export const ValueRowHeader = styled.div.attrs<{ row: number; column: number; rows: number; last: boolean }>(
	({row, column, rows, last}) => {
		return {
			'data-widget': 'convergence-values-grid-row-header',
			style: {
				gridRow: `${row} / span ${rows}`,
				gridColumn: column,
				borderBottom: last ? 'var(--border)' : (void 0),
				borderBottomLeftRadius: (column === 1 && last) ? 'var(--border-radius)' : (void 0)
			}
		};
	})<{ row: number; column: number; rows: number; last: boolean }>`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	padding         : calc(var(--margin) / 2);
	border-top      : var(--border);
	border-left     : var(--border);
`;
export const ValueCell = styled.div.attrs<{ row: number; column: number; lastColumn: boolean; lastRow: boolean }>(
	({row, column, lastColumn, lastRow}) => {
		return {
			'data-widget': 'convergence-values-grid-value-cell',
			style: {
				gridRow: row,
				gridColumn: column,
				borderRight: lastColumn ? 'var(--border)' : (void 0),
				borderBottom: lastRow ? 'var(--border)' : (void 0),
				borderBottomRightRadius: (lastRow && lastColumn) ? 'var(--border-radius)' : (void 0)
			}
		};
	})<{ row: number; column: number; lastColumn: boolean; lastRow: boolean }>`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : end;
	padding         : calc(var(--margin) / 2);
	border-top      : var(--border);
	border-left     : var(--border);
`;
