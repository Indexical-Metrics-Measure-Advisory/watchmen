import styled from 'styled-components';

export const DefGrid = styled.div.attrs<{ yCount: number }>(
	({yCount}) => {
		return {
			'data-widget': 'convergence-def-grid',
			style: {
				gridTemplateColumns: `minmax(200px, auto) ${new Array(yCount - 1).fill('auto').join(' ')} 1fr`
			}
		};
	})<{ yCount: number }>`
	display               : grid;
	position              : relative;
	grid-template-columns : minmax(200px, auto) 1fr;
`;
export const LeadCorner = styled.div.attrs<{ yCount: number; xCount: number }>(
	({yCount, xCount}) => {
		return {
			'data-widget': 'convergence-def-lead-corner',
			style: {
				gridRow: `span ${xCount}`,
				gridColumn: `span ${yCount}`
			}
		};
	}
)<{ yCount: number; xCount: number }>`
	display                : block;
	position               : relative;
	border                 : var(--border);
	border-top-left-radius : var(--border-radius);
	min-height             : var(--tall-height);
	border-right           : 0;
	border-bottom          : 0;
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
	& ~ div[data-widget=convergence-def-y-axis],
	& ~ div[data-widget=convergence-def-y-axis] ~ div {
		grid-row : ${({xCount}) => xCount + 1};
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
export const YVariableContent = styled.div.attrs({'data-widget': 'convergence-def-x-axis-variable-content'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
	align-items           : center;
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