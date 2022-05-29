import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const CriteriaContainer = styled.div.attrs({'data-widget': 'topic-snapshot-criteria-container'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
`;
export const CriteriaLabel = styled.span.attrs({'data-widget': 'topic-snapshot-criteria-label'})`
	display      : flex;
	position     : relative;
	align-items  : flex-start;
	min-height   : var(--tall-height);
	line-height  : var(--tall-height);
	font-weight  : var(--font-demi-bold);
	font-variant : petite-caps;
	font-size    : calc(var(--font-size) * 1.2);
	white-space  : nowrap;
`;
export const CriteriaTopicDropdown = styled(Dropdown).attrs({'data-widget': 'topic-snapshot-criteria-topic-dropdown'})`
	font-size    : calc(var(--font-size) * 1.2);
	height       : var(--tall-height);
	padding      : 0 calc(var(--margin) / 2);
	width        : auto;
	min-width    : 350px;
	justify-self : baseline;
	> svg {
		margin-left : calc(var(--margin) / 2);
	}
	> div[data-widget=dropdown-options-container] {
		max-height : calc(var(--tall-height) * 8 + 2px);
		> span[data-widget=dropdown-option] {
			padding : 0 calc(var(--margin) / 2);
			height  : var(--tall-height);
		}
	}
`;
export const CriteriaFrequencyContainer = styled.div.attrs({'data-widget': 'topic-snapshot-criteria-frequencies'})`
	display     : flex;
	position    : relative;
	align-items : center;
	> *:not(:first-child) {
		margin-left : calc(var(--margin) / 2);
	}
	> span {
		cursor : pointer;
	}
`;
export const CriteriaSearchButton = styled(Button).attrs({'data-widget': 'topic-snapshot-criteria-button'})`
	height        : calc(var(--tall-height) - 2px);
	border-radius : calc(var(--tall-height) / 2);
	font-size     : calc(var(--font-size) * 1.2);
	padding       : 0 var(--margin);
	justify-self  : baseline;
	min-width     : 200px;
	> svg {
		margin-left  : calc(var(--margin) / 2);
		margin-right : calc(var(--margin) / -4);
	}
`;
