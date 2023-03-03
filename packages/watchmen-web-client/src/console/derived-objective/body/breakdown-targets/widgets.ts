import styled from 'styled-components';

export const BreakdownTargetsContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-targets'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	grid-column    : span 5;
	margin-top     : calc(var(--margin) / 2);
	margin-bottom  : calc(var(--margin) / 2);
`;
export const BreakdownTargetContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target'})`
	display               : grid;
	position              : relative;
	grid-template-columns : minmax(300px, 30%) 1fr;
	grid-column-gap       : var(--margin);
	margin-top            : calc(var(--margin) / 2);
`;
export const BreakdownTargetTitleContainer = styled.div.attrs({'data-widget': ''})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr;
	grid-column-gap       : calc(var(--margin) / 4);
	align-items           : center;
	grid-column           : span 2;
	margin-bottom         : calc(var(--margin) / 2);
	> span:first-child {
		font-weight : var(--font-bold);
		opacity     : 0.5;
	}
	> div[data-widget=page-title-editor] {
		justify-self : start;
		padding-left : 0;
		> div, > input {
			font-size : 1.2em;
		}
		> input {
			padding             : calc(var(--margin) / 4);
			border-bottom       : var(--border);
			border-bottom-color : transparent;
			border-radius       : 0;
			opacity             : 0.8;
			&:hover, &:focus {
				border-bottom-color : var(--primary-color);
				box-shadow          : none;
			}
		}
	}
`
export const BreakdownTargetDimensions = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-dimensions'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 2);
`;
export const BreakdownTargetDimension = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-dimension'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(2, calc(50% - 16px)) 32px;
	> div[data-widget=dropdown]:first-child {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
	}
	> div[data-widget=dropdown]:nth-child(2) {
		border-right  : 0;
		border-radius : 0;
		margin-left   : -1px;
	}
	> button {
		color                     : var(--primary-color);
		border                    : var(--border);
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
		margin-left               : -1px;
		&:hover {
			box-shadow   : var(--danger-shadow);
			border-color : var(--danger-color);
			color        : var(--danger-color);
			> svg {
				opacity : 1;
			}
		}
		> svg {
			opacity    : 0.5;
			transition : opacity 300ms ease-in-out;
		}
	}
	> div:first-child:last-child {
		grid-column                : span 3;
		border-top-right-radius    : var(--border-radius);
		border-bottom-right-radius : var(--border-radius);
	}
`;
export const BreakdownTargetData = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-data'})`
	display     : block;
	position    : relative;
	border-left : var(--border);
`;
