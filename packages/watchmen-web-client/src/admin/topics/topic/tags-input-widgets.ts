import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const TopicTagsContainer = styled.div.attrs({'data-widget': 'topic-tags-input'})`
	display         : flex;
	position        : relative;
	flex-wrap       : wrap;
	align-items     : center;
	align-self      : center;
	min-height      : var(--height);
	padding         : calc(var(--margin) / 8) 0;
`;

export const TopicTagsChips = styled.div.attrs({'data-widget': 'topic-tags-chips'})`
	display    : flex;
	flex-wrap  : wrap;
	align-items: center;
	gap        : calc(var(--margin) / 4);
`;

export const TopicTagsChip = styled.span.attrs({'data-widget': 'topic-tags-chip'})`
	display      : flex;
	align-items  : center;
	height       : calc(var(--height) * 0.72);
	padding      : 0 calc(var(--margin) / 4);
	border       : var(--border);
	border-radius: calc(var(--border-radius) / 2);
	font-size    : 0.9em;
	white-space  : nowrap;
`;

export const TopicTagsChipRemove = styled.span.attrs({'data-widget': 'topic-tags-chip-remove'})`
	display     : flex;
	align-items : center;
	margin-left : calc(var(--margin) / 5);
	font-size   : 0.7em;
	opacity     : 0.6;
	cursor      : pointer;
	&:hover {
		opacity : 1;
		color   : var(--danger-color);
	}
`;

export const TopicTagsInputBox = styled(Input).attrs({'data-widget': 'topic-tags-input-box'})`
	width      : 12em;
	height     : calc(var(--height) * 0.72);
	margin-left: calc(var(--margin) / 4);
`;

export const TopicTagsSuggestion = styled.div.attrs({'data-widget': 'topic-tags-suggestion'})`
	display          : flex;
	flex-direction   : column;
	position         : absolute;
	top              : 100%;
	left             : 0;
	z-index          : 10;
	min-width        : 100%;
	max-height       : 14em;
	overflow-y       : auto;
	background-color : var(--bg-color);
	border           : var(--border);
	border-radius    : var(--border-radius);
	box-shadow       : var(--box-shadow);
	> span {
		display    : flex;
		align-items: center;
		padding    : 0 calc(var(--margin) / 2);
		height     : calc(var(--height) * 0.8);
		white-space: nowrap;
		cursor     : pointer;
		&:hover {
			background-color : var(--hover-color);
		}
	}
`;
