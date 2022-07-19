import styled from 'styled-components';

export const CriteriaContainer = styled.div.attrs({'data-widget': 'inspection-criteria'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
`;
export const CriteriaRows = styled.div.attrs({'data-widget': 'inspection-criteria-rows'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
`;
export const CriteriaRow = styled.div.attrs({'data-widget': 'inspection-criteria-row'})`
	display               : grid;
	grid-template-columns : 32px 250px 220px 200px auto;
	grid-column-gap       : calc(var(--margin) / 4);
	align-items           : center;
	&:hover {
		span[data-widget=inspection-criteria-button] {
			opacity        : 1;
			pointer-events : auto;
		}
	}
`;
export const InspectionCriteriaIndex = styled.span.attrs({'data-widget': 'inspection-criteria-index'})`
	font-size : 0.8em;
`;
export const InspectionCriteriaFactor = styled.div.attrs({'data-widget': 'inspection-criteria-factor'})`
	> span {
		font-variant : petite-caps;
	}
	> div[data-widget=dropdown] {
		width : 100%;
	}
`;
export const InspectionCriteriaArithmetic = styled.div.attrs({'data-widget': 'inspection-criteria-arithmetic'})`
	> div[data-widget=dropdown] {
		width : 100%;
	}
`;
export const InspectionCriteriaValue = styled.div.attrs({'data-widget': 'inspection-criteria-value'})`
	> div[data-widget=dropdown] {
		width : 100%;
	}
	> input {
		width     : 100%;
		font-size : 1em;
		color     : var(--achievement-indicator-color);
	}
`;
export const InspectionCriteriaButtons = styled.div.attrs({'data-widget': 'inspection-criteria-buttons'})`
	display  : flex;
	position : relative;
`;
export const InspectionCriteriaButton = styled.span.attrs({'data-widget': 'inspection-criteria-button'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	height          : var(--height);
	width           : calc(var(--height) * 1.2);
	border          : var(--border);
	border-radius   : calc(var(--border-radius) * 2);
	border-color    : var(--danger-color);
	color           : var(--danger-color);
	transition      : background-color 300ms ease-in-out, color 300ms ease-in-out, opacity 300ms ease-in-out;
	cursor          : pointer;
	opacity         : 0;
	pointer-events  : none;
	&:hover {
		background-color : var(--danger-color);
		color            : var(--invert-color);
	}
`;
