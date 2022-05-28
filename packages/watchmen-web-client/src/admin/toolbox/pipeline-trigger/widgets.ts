import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const TopicPickerContainer = styled.div.attrs({'data-widget': 'pipeline-trigger-topic-picker-container'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	font-size             : calc(var(--font-size) * 1.2);
`;
export const PipelineTriggerLabel = styled.span.attrs({'data-widget': 'pipeline-trigger-label'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	min-height   : var(--tall-height);
	font-weight  : var(--font-demi-bold);
	font-variant : petite-caps;
	white-space  : nowrap;
`;
export const TopicDropdown = styled(Dropdown).attrs({'data-widget': 'pipeline-trigger-topic-dropdown'})`
	height    : var(--tall-height);
	padding   : 0 calc(var(--margin) / 2);
	min-width : 350px;
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
