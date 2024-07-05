import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const TopicFinderContainer = styled.div.attrs({'data-widget': 'topic-finder'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, 200px) ;
	//> div[data-widget=dropdown]:first-child:last-child {
	//	border-radius : calc(var(--param-height) / 2);
	//}
`;
export const TopicDropdown = styled(Dropdown).attrs({'data-no-border': true})`
	align-self       : center;
	justify-self     : start;
	height           : var(--param-height);
	padding          : 0 calc(var(--margin) / 2);
	background-color : var(--bg-color);
	border           : 0;
	border-radius    : calc(var(--param-height) / 2);
	box-shadow       : var(--param-border);
	&:hover,
	&:focus {
		z-index    : 1;
		box-shadow : var(--primary-hover-shadow);
	}
	> span[data-widget="dropdown-label"] {
		min-width : 120px;
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
export const PrefillButton = styled(Button)`
	height        : var(--param-height);
	border        : 0;
	border-radius : calc(var(--param-height) / 2);
	margin-left   : calc(var(--margin) / 2);
	align-self    : center;
	justify-self  : start;
	//box-shadow    : var(--param-primary-border);
	&[data-ink=primary] {
		&:hover {
			box-shadow : var(--param-primary-border), var(--primary-hover-shadow);
		}
	}
	> svg {
		font-size : 0.8em;
	}
`;