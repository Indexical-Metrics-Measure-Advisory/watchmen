import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const TriggerContainer = styled.div.attrs({'data-widget': 'pipeline-trigger-container'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
	align-content         : start;
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
export const CollectorTriggerContainer = styled.div.attrs<{ standalone?: boolean }>(({standalone = false}) => {
	return {
		'data-widget': 'collector-trigger-container',
		'data-standalone': standalone
	};
})<{ standalone?: boolean }>`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px minmax(350px, 520px);
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : var(--margin);
	padding-top           : calc(var(--margin) * 2);
	border-top            : 1px solid var(--border-color);
	margin-top            : calc(var(--margin) * 2);
	align-items           : center;
	align-content         : start;
	&[data-standalone=true] {
		padding-top : 0;
		border-top  : 0;
		margin-top  : 0;
	}
`;
export const CollectorTriggerInput = styled(Input).attrs({'data-widget': 'collector-trigger-input'})`
	font-size    : calc(var(--font-size) * 1.2);
	height       : var(--tall-height);
	padding      : 0 calc(var(--margin) / 2);
	width        : auto;
	min-width    : 300px;
	justify-self : baseline;
`;
export const CollectorDateTimeInput = styled(Input).attrs({
	'data-widget': 'collector-trigger-datetime-input',
	type: 'datetime-local',
	autoSelect: false
})`
	font-size        : calc(var(--font-size) * 1.2);
	height           : var(--tall-height);
	padding          : 0 calc(var(--margin) / 2);
	width            : auto;
	min-width        : 350px;
	justify-self     : baseline;
	transition       : all 300ms ease-in-out;
	padding-right    : calc(var(--margin) * 2.5);
	box-sizing       : border-box;
	line-height      : var(--tall-height);
	-webkit-appearance: none;
	&::-webkit-date-and-time-value {
		text-align : left;
	}
	&::-webkit-datetime-edit {
		padding : 0;
	}
	&::-webkit-datetime-edit-fields-wrapper {
		padding : 0;
	}
	&::-webkit-calendar-picker-indicator {
		cursor     : pointer;
		opacity    : 0.75;
		filter     : grayscale(1);
		transition : opacity 300ms ease-in-out;
	}
	&:hover::-webkit-calendar-picker-indicator,
	&:focus::-webkit-calendar-picker-indicator {
		opacity : 1;
	}
`;
export const CollectorPipelineDropdown = styled(Dropdown).attrs({'data-widget': 'collector-trigger-pipeline-dropdown'})`
	font-size    : calc(var(--font-size) * 1.2);
	height       : var(--tall-height);
	padding      : 0 calc(var(--margin) / 2);
	width        : auto;
	min-width    : 350px;
	justify-self : baseline;
`;
export const CollectorSectionLabel = styled(TriggerLabel)`
	margin-top : calc(var(--margin) / 2);
`;
