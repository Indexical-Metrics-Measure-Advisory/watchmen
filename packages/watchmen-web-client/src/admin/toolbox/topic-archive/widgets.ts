import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import styled from 'styled-components';

export const CriteriaContainer = styled.div.attrs({'data-widget': 'topic-archive-criteria-container'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
`;
export const CriteriaLabel = styled.span.attrs({'data-widget': 'topic-archive-criteria-label'})`
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
export const CriteriaTopicDropdown = styled(Dropdown).attrs({'data-widget': 'topic-archive-criteria-topic-dropdown'})`
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
export const CriteriaButtonBar = styled.div.attrs({'data-widget': 'topic-archive-criteria-button-bar'})`
	display  : flex;
	position : relative;
`;
export const CriteriaSearchButton = styled(Button).attrs({'data-widget': 'topic-archive-criteria-button'})`
	height        : calc(var(--tall-height) - 2px);
	border-radius : calc(var(--tall-height) / 2);
	font-size     : calc(var(--font-size) * 1.2);
	padding       : 0 var(--margin);
	justify-self  : baseline;
	min-width     : 200px;
	&:not(:first-child) {
		margin-left : calc(var(--margin) / 2);
	}
	> svg {
		margin-left  : calc(var(--margin) / 2);
		margin-right : calc(var(--margin) / -4);
	}
`;
export const ResultContainer = styled.div.attrs({'data-widget': 'topic-archive-result-container'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	grid-column    : 1 / span 2;
	margin-top     : var(--margin);
`;
export const ResultHeader = styled.div.attrs({'data-widget': 'topic-archive-result-header'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 40px 1fr 180px 180px 120px 220px;
	&:before {
		content                 : '';
		display                 : block;
		position                : absolute;
		top                     : 0;
		left                    : 0;
		width                   : 100%;
		height                  : 100%;
		background-color        : var(--primary-color);
		border-top-left-radius  : calc(var(--border-radius) * 2);
		border-top-right-radius : calc(var(--border-radius) * 2);
		opacity                 : 0.1;
		z-index                 : -1;
	}
`;
export const ResultHeaderCell = styled.div.attrs({'data-widget': 'topic-archive-result-header-cell'})`
	display       : flex;
	position      : relative;
	align-items   : center;
	min-height    : var(--header-height);
	font-variant  : petite-caps;
	font-weight   : var(--font-demi-bold);
	padding       : 0 calc(var(--margin) / 4);
	border-top    : var(--border);
	border-bottom : var(--border);
	overflow      : hidden;
	white-space   : nowrap;
	text-overflow : ellipsis;
	opacity       : 0.9;
	&:first-child {
		border-top-left-radius : calc(var(--border-radius) * 2);
		border-left            : var(--border);
	}
	&:last-child {
		border-top-right-radius : calc(var(--border-radius) * 2);
		border-right            : var(--border);
	}
`;
export const ResultNoData = styled.div.attrs({'data-widget': 'topic-archive-result-no-data'})`
	display                    : flex;
	position                   : relative;
	align-items                : center;
	min-height                 : var(--header-height);
	font-variant               : petite-caps;
	font-weight                : var(--font-demi-bold);
	padding                    : 0 calc(var(--margin) / 4) 0 calc(40px + var(--margin) / 4);
	opacity                    : 0.7;
	border-bottom-left-radius  : calc(var(--border-radius) * 2);
	border-bottom-right-radius : calc(var(--border-radius) * 2);
	border-left                : var(--border);
	border-bottom              : var(--border);
	border-right               : var(--border);
`;
export const ResultBodyRow = styled.div.attrs({'data-widget': 'topic-archive-result-body-row'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 40px 1fr 180px 180px 120px 220px;
	&:nth-child(2n) {
		background-color : var(--grid-rib-bg-color);
	}
	&:nth-last-child(2) {
		border-bottom-left-radius  : calc(var(--border-radius) * 2);
		border-bottom-right-radius : calc(var(--border-radius) * 2);
		> div:first-child:nth-last-child(6) {
			border-bottom-left-radius : calc(var(--border-radius) * 2);
		}
		> div:last-child {
			border-bottom-right-radius : calc(var(--border-radius) * 2);
		}
	}
	&:hover {
		background-color : var(--hover-color);
	}
`;
export const ResultBodyCell = styled.div.attrs({'data-widget': 'topic-archive-result-body-cell'})`
	display       : flex;
	position      : relative;
	align-items   : center;
	min-height    : var(--header-height);
	font-variant  : petite-caps;
	padding       : 0 calc(var(--margin) / 4);
	border-bottom : var(--border);
	overflow      : hidden;
	white-space   : nowrap;
	text-overflow : ellipsis;
	&:last-child, &:nth-child(6) {
		border-right : var(--border);
	}
	&:first-child {
		border-left : var(--border);
	}
	> button {
		padding : 0;
		height  : calc(var(--button-height-in-form) * 1.1);
		width   : calc(var(--button-height-in-form) * 1.1);
	}
`;
export const ResultActionButtons = styled.div.attrs({'data-widget': 'topic-archive-result-actions'})`
	display     : flex;
	position    : relative;
	align-items : center;
	> button:not(:first-child) {
		margin-left : calc(var(--margin) / 4);
	}
	> button {
		width : auto;
		> svg {
			margin : 0 calc(var(--margin) / 4);
		}
	}
`;
export const ResultRowEditor = styled.div.attrs({'data-widget': 'topic-archive-result-row-editor'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 180px 1fr 180px 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
	margin-top            : var(--margin);
	margin-bottom         : var(--margin);
	transition            : height 300ms ease-in-out;
`;
export const EditLabel = styled.div.attrs({'data-widget': 'topic-archive-edit-label'})`
	display      : flex;
	position     : relative;
	align-items  : flex-start;
	min-height   : var(--height);
	line-height  : var(--height);
	white-space  : nowrap;
	font-variant : petite-caps;
	+ div[data-widget=dropdown] {
		width        : auto;
		min-width    : 150px;
		justify-self : baseline;
	}
`;
export const FilterContainer = styled.div.attrs({
	'data-v-scroll': '',
	'data-widget': 'topic-archive-filter-edit'
})`
	display     : block;
	position    : relative;
	grid-column : 1 / span 4;
	margin-top  : calc(var(--margin) / -2);
	margin-left : calc(var(--margin) / -2);
	padding     : calc(var(--margin) / 2);
	overflow-x  : hidden;
	overflow-y  : auto;
	align-self  : stretch;
	height      : calc(80vh - var(--margin) * 1.5 - var(--font-size) * 1.5 - var(--margin) * 2 - var(--height) * 4 - var(--margin) * 2);
`;
