import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const TriggerContainer = styled.div.attrs({'data-widget': 'pipeline-trigger-container'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);

`;
export const PipelineTriggerLabel = styled.span.attrs({'data-widget': 'pipeline-trigger-label'})`
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
export const TopicDropdown = styled(Dropdown).attrs({'data-widget': 'pipeline-trigger-topic-dropdown'})`
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
export const TopicFilterContainer = styled.div.attrs({'data-widget': 'topic-filter-edit'})`
	display        : flex;
	position       : relative;
	flex-grow      : 1;
	flex-direction : column;
	padding        : calc(var(--margin) / 4) calc(var(--margin) / 2) calc(var(--margin) / 4) 0;
`;
