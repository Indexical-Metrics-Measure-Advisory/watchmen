import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const FactorEditContainer = styled.div.attrs({'data-widget': 'parameter-factor-edit'})`
	display               : grid;
	grid-template-columns : auto auto 1fr;
	position              : relative;
	align-self            : center;
	align-items           : center;
	height                : var(--param-height);
	margin-left           : calc(var(--margin) / 2);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : calc(var(--param-height) / 2);
		left             : calc(var(--margin) / -2);
		width            : calc(var(--margin) / 2);
		height           : 1px;
		background-color : var(--border-color);
		z-index          : -1;
	}
`;
export const FactorDropdown = styled(Dropdown).attrs<{ valid: boolean }>({'data-no-border': true})<{ valid: boolean }>`
	height           : var(--param-height);
	padding          : 0 calc(var(--margin) / 2);
	border           : 0;
	border-radius    : calc(var(--param-height) / 2);
	box-shadow       : ${({valid}) => valid ? 'var(--param-border)' : 'var(--param-danger-border)'};
	background-color : var(--bg-color);
	min-width        : 300px;
	&:hover,
	&:focus {
		z-index    : 1;
		box-shadow : ${({valid}) => valid ? 'var(--primary-hover-shadow)' : 'var(--danger-hover-shadow)'};
		> div[data-widget="dropdown-options-container"] {
			box-shadow : ${({valid}) => valid ? 'var(--param-border)' : 'var(--danger-hover-shadow)'};
		}
	}
	> span[data-widget="dropdown-label"] {
		min-width : 120px;
	}
	> svg {
		color : ${({valid}) => valid ? (void 0) : 'var(--danger-color)'};
	}
	> div[data-widget="dropdown-options-container"] {
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
