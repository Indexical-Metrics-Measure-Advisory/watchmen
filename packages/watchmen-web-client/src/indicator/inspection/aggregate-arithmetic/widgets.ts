import styled from 'styled-components';
import {InspectionDropdown} from '../widgets';

export const ValueTransformContainer = styled.div.attrs({'data-widget': 'inspection-value-transform'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 250px auto auto auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
`;

export const ValueTransformDropdown = styled(InspectionDropdown)`
	min-width : 250px;
`;

// export const ValueTransformButton = styled(InspectionButton)`
// 	border-radius : var(--border-radius);
// 	cursor        : text;
// 	&[data-ink=success]:hover {
// 		box-shadow : none;
// 	}
// `;
export const ValueTransformButton = styled.span.attrs({'data-widget': 'inspection-value-transform-button'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	min-height       : var(--tall-height);
	padding          : 0 var(--margin);
	border-radius    : var(--border-radius); //calc(var(--tall-height) / 2);
	background-color : var(--success-color);
	color            : var(--invert-color);
	font-variant     : petite-caps;
	white-space      : nowrap;
`;