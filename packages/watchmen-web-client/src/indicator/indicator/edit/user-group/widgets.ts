import styled from 'styled-components';
import {ItemBlock} from '../widgets';

export const AssignedIndicatorUserGroupsContainer = styled.div.attrs({'data-widget': 'assigned-indicator-user-groups'})`
	display     : flex;
	position    : relative;
	flex-wrap   : wrap;
	align-items : center;
	padding     : calc(var(--margin) / 4) var(--margin) 0 0;
	margin-left : calc(var(--margin) / -2);
	&:empty {
		padding-top : 0;
	}
`;
export const AssignedIndicatorUserGroup = styled(ItemBlock).attrs({'data-widget': 'assigned-indicator-user-group'})`
	padding : 0 0 0 calc(var(--margin) / 2);
	&:after {
		background-color : var(--danger-color);
	}
	&:hover > span:last-child {
		left : calc(var(--height) * -0.1);
	}
	> span:nth-child(2) {
		padding-right : calc(var(--margin) / 2);
	}
	> span:last-child {
		display          : flex;
		position         : relative;
		align-items      : center;
		justify-content  : center;
		height           : calc(var(--height) * 0.64);
		min-width        : calc(var(--height) * 0.64);
		left             : var(--height);
		color            : var(--invert-color);
		background-color : var(--danger-color);
		opacity          : 0.7;
		cursor           : pointer;
		border-radius    : var(--border-radius);
		transition       : background-color 300ms ease-in-out, left 300ms ease-in-out;
	}
`;

export const IndicatorUserGroupPickerContainer = styled.div.attrs({'data-widget': 'indicator-user-group-picker'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	> div[data-widget=search-text] {
		margin-left  : calc(var(--margin) / -8);
		margin-top   : calc(var(--margin) / 2);
		margin-right : var(--margin);
		> input[data-widget=search-input],
		> button[data-widget=search-button] {
			font-size   : 1em;
			height      : var(--height);
			line-height : calc(var(--height) * 0.9);
		}
		> div[data-widget=search-popup] {
			min-height : calc(var(--height) + 4px);
			max-height : calc(var(--height) * 8 + 4px);
			> div[data-widget=search-candidate-item],
			> div[data-widget=search-on-searching] {
				font-size  : 1em;
				min-height : var(--height);
			}
		}
	}
`;

