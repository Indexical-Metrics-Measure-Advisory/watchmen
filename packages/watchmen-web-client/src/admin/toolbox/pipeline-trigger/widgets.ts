import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const TriggerContainer = styled.div.attrs({'data-widget': 'pipeline-trigger-container'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
`;
export const TriggerLabel = styled.span.attrs({'data-widget': 'pipeline-trigger-label'})`
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
export const TriggerText = styled.span.attrs({'data-widget': 'pipeline-trigger-text'})`
	display      : flex;
	position     : relative;
	align-items  : flex-start;
	min-height   : var(--tall-height);
	line-height  : var(--tall-height);
	font-variant : petite-caps;
	white-space  : nowrap;
	&[data-big=true] {
		font-size : 2em;
	}
	> span[data-ink=primary] {
		font-weight : var(--font-bold);
		color       : var(--primary-color);
		margin-left : 0.5em;
	}
	> span[data-ink=danger] {
		font-weight : var(--font-bold);
		color       : var(--danger-color);
		margin-left : 0.5em;
	}
	> span[data-ink=success] {
		font-weight : var(--font-bold);
		color       : var(--success-color);
		margin-left : 0.5em;
	}
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
export const TriggerPipelinesContainer = styled.div.attrs({'data-widget': 'pipeline-trigger-pipelines'})`
	display     : flex;
	position    : relative;
	flex-grow   : 1;
	flex-wrap   : wrap;
	margin-left : calc(var(--margin) / -2);
	margin-top  : calc(var(--margin) / -2 + (var(--tall-height) - var(--height)) / 2);
`;
export const TriggerPipeline = styled.div.attrs<{ selected: boolean }>(({selected}) => {
	return {
		'data-widget': 'pipeline-trigger-pipeline',
		style: {
			backgroundColor: selected ? 'var(--param-bg-color)' : (void 0)
		}
	};
})<{ selected: boolean }>`
	display       : flex;
	position      : relative;
	align-items   : center;
	padding       : 0 calc(var(--margin) / 2);
	height        : var(--height);
	border-radius : calc(var(--height) / 2);
	box-shadow    : var(--param-border);
	cursor        : pointer;
	margin-left   : calc(var(--margin) / 2);
	margin-top    : calc(var(--margin) / 2);
	transition    : background-color 300ms ease-in-out;
`;
export const TriggerFilterContainer = styled.div.attrs({'data-widget': 'pipeline-trigger-filter-edit'})`
	display        : flex;
	position       : relative;
	flex-grow      : 1;
	flex-direction : column;
	padding        : calc(var(--margin) / 4) calc(var(--margin) / 2) calc(var(--margin) / 4) 0;
`;
export const TriggerButton = styled(Button).attrs({'data-widget': 'pipeline-trigger-button'})`
	height        : calc(var(--tall-height) - 2px);
	border-radius : calc(var(--tall-height) / 2);
	font-size     : calc(var(--font-size) * 1.2);
	padding       : 0 var(--margin);
	justify-self  : baseline;
	> svg {
		margin-left  : calc(var(--margin) / 2);
		margin-right : calc(var(--margin) / -4);
	}
`;
export const RunInBrowserContainer = styled.div`
	display  : flex;
	position : relative;
	> *:not(:first-child) {
		margin-left : calc(var(--margin) / 2);
	}
	> input {
		font-size : calc(var(--font-size) * 1.2);
		height    : var(--tall-height);
		padding   : 0 calc(var(--margin) / 2);
	}
`;