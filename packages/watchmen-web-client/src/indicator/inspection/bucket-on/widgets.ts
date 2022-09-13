import styled from 'styled-components';
import {InspectionDropdown} from '../widgets';

export const BucketOnContainer = styled.div.attrs({'data-widget': 'inspection-bucket-on'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 250px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
`;
export const BucketOnRows = styled.div.attrs({'data-widget': 'inspection-bucket-on-rows'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
`;
export const BucketOnRow = styled.div.attrs({'data-widget': 'inspection-bucket-on-row'})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 4);
	&:hover {
		span[data-widget=inspection-bucket-on-button] {
			opacity        : 1;
			pointer-events : auto;
		}
	}
`;
export const BucketOnDropdown = styled(InspectionDropdown)`
	min-width : 250px;
`;
export const BucketOnButtons = styled.div.attrs({'data-widget': 'inspection-bucket-on-buttons'})`
	display  : flex;
	position : relative;
`;
export const BucketOnButton = styled.span.attrs({'data-widget': 'inspection-bucket-on-button'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	height          : var(--tall-height);
	width           : var(--tall-height);
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
