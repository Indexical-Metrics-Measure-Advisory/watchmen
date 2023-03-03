import styled from 'styled-components';

export const BreakdownTargetsContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-targets'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	grid-column    : span 5;
	margin-top     : calc(var(--margin) / 2);
`;
export const BreakdownTargetContainer = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target'})`
	display               : grid;
	position              : relative;
	grid-template-columns : minmax(300px, 30%) 1fr;
	grid-column-gap       : var(--margin);
	margin-top            : calc(var(--margin) / 2);
`;
export const BreakdownTargetDimensions = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-dimensions'})`
	display               : flex;
	position              : relative;
	flex-direction: column;
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
		border                    : var(--border);
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
		margin-left               : -1px;
		&:hover {
			box-shadow   : var(--danger-shadow);
			border-color : var(--danger-color);
			color        : var(--danger-color);
			//color            : var(--invert-color);
		}
	}
	> div:first-child:last-child {
		grid-column : span 3;
	}
`;
export const BreakdownTargetData = styled.div.attrs({'data-widget': 'derived-objective-breakdown-target-data'})`
	display     : block;
	position    : relative;
	border-left : var(--border);
`;
