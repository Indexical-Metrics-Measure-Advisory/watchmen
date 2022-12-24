import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const BucketEditContainer = styled.div.attrs({'data-widget': 'parameter-bucket-edit'})`
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
export const BSDropdown = styled(Dropdown).attrs<{ valid: boolean }>({})<{ valid: boolean }>`
	height           : var(--param-height);
	padding          : 0 calc(var(--margin) / 2);
	border           : 0;
	box-shadow       : ${({valid}) => valid ? 'var(--param-border)' : 'var(--param-danger-border)'};
	background-color : var(--bg-color);
	min-width        : 200px;
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
export const BucketDropdown = styled(BSDropdown)`
	border-radius    : calc(var(--param-height) / 2) 0 0 calc(var(--param-height) / 2);
`;
export const SegmentDropdown = styled(BSDropdown)`
	border-radius    : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
`;
export const IncorrectOptionLabel = styled.span.attrs({'data-widget': 'incorrect-option'})`
	color           : var(--danger-color);
	text-decoration : line-through;
`;
