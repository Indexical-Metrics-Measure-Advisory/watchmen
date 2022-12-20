import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';
import {ItemLabel, RibItemContainer} from '../widgets';

export const FactorsContainer = styled.div.attrs({'data-widget': 'objective-factors'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
`;
export const FactorContainer = styled(RibItemContainer).attrs({'data-widget': 'objective-factor'})`
	grid-template-columns : 40px auto auto 1fr;
	padding               : calc(var(--margin) / 2);
	> input:nth-child(2) {
		grid-column : 2 / span 2;
		width       : 400px;
	}
	> div[data-widget=objective-computation] {
		grid-column : 3 / span 2;
	}
	> button:last-child {
		position : absolute;
		bottom   : calc(var(--margin) / 2);
		right    : var(--margin);
	}
`;
export const FactorItemLabel = styled(ItemLabel)`
	grid-column      : 2;
	font-weight      : var(--font-bold);
	align-self       : start;
	margin-top       : calc((var(--height) - var(--param-height)) / 2);
	height           : var(--param-height);
	line-height      : var(--param-height);
	background-color : var(--param-bg-color);
	border-radius    : calc(var(--param-height) / 2) 0 0 calc(var(--param-height) / 2);
	padding          : 0 calc(var(--margin) / 2);
	box-shadow       : var(--param-border);
	overflow         : hidden;
	+ div[data-widget=objective-computation] {
		margin-left : calc(var(--margin) / -2);
		> div[data-widget=objective-formula-operator] {
			border-top-left-radius    : 0;
			border-bottom-left-radius : 0;
		}
	}
`;
export const IndicatorDropdown = styled(Dropdown).attrs<{ valid: boolean }>({})<{ valid: boolean }>`
	grid-column      : 3 / span 2;
	justify-self     : start;
	height           : var(--param-height);
	padding          : 0 calc(var(--margin) / 2);
	border           : 0;
	border-radius    : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
	box-shadow       : ${({valid}) => valid ? 'var(--param-border)' : 'var(--param-danger-border)'};
	background-color : var(--bg-color);
	min-width        : 300px;
	width            : unset;
	margin-top       : calc(var(--height) / 2 - var(--param-height) / 2);
	margin-left      : calc(var(--margin) / -2);
	&:hover,
	&:focus-within {
		z-index    : 1;
		box-shadow : ${({valid}) => valid ? 'var(--primary-hover-shadow)' : 'var(--danger-hover-shadow)'};
		> div[data-widget=dropdown-options-container] {
			box-shadow : ${({valid}) => valid ? 'var(--param-border)' : 'var(--danger-hover-shadow)'};
		}
	}
	> span[data-widget="dropdown-label"] {
		min-width : 120px;
	}
	> svg {
		color : ${({valid}) => valid ? (void 0) : 'var(--danger-color)'};
	}
	> div[data-widget=dropdown-options-container] {
		border     : 0;
		box-shadow : var(--param-border);
		> span {
			padding : 0 calc(var(--margin) / 2);
		}
	}
`;
export const IncorrectOptionLabel = styled.span.attrs({'data-widget': 'incorrect-option'})`
	color           : var(--danger-color);
	text-decoration : line-through;
`;