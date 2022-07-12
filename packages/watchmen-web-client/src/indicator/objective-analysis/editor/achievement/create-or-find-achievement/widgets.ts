import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const CreateOrFindContainer = styled.div.attrs({'data-widget': 'achievement-create-or-find'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 200px auto auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	margin-top            : var(--margin);
	font-size             : calc(var(--font-size) * 1.2);
	> div[data-widget=achievement-dropdown] {
		min-width : 250px;
	}
`;
export const AchievementLabel = styled.span.attrs({'data-widget': 'achievement-label'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	min-height   : var(--tall-height);
	font-weight  : var(--font-demi-bold);
	font-variant : petite-caps;
	white-space  : nowrap;
`;
export const OrLabel = styled(AchievementLabel)`
	opacity : 0.7;
`;
export const AchievementEntityLabel = styled.span.attrs({'data-widget': 'achievement-entity-label'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	min-height       : var(--tall-height);
	padding          : 0 var(--margin);
	border-radius    : var(--border-radius); //calc(var(--tall-height) / 2);
	background-color : var(--success-color);
	color            : var(--invert-color);
	font-variant     : petite-caps;
	white-space      : nowrap;
`;
export const AchievementDropdown = styled(Dropdown).attrs({'data-widget': 'achievement-dropdown'})`
	height  : var(--tall-height);
	padding : 0 calc(var(--margin) / 2);
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
export const AchievementButton = styled(Button).attrs({'data-widget': 'achievement-button'})`
	height        : var(--tall-height);
	border-radius : calc(var(--tall-height) / 2);
	font-size     : calc(var(--font-size) * 1.2);
	padding       : 0 var(--margin);
	&[data-hide-on-print=true] {
		@media print {
			display : none;
		}
	}
	> svg:first-child {
		margin-top   : 2px;
		margin-right : calc(var(--margin) / 4);
		font-size    : 0.8em;
	}
`;
export const AchievementInput = styled(Input).attrs({'data-widget': 'achievement-input'})`
	font-size     : calc(var(--font-size) * 1.2);
	padding       : 0 calc(var(--margin) / 2);
	border        : 0;
	border-bottom : var(--border);
	border-radius : 0;
`;
export const NoAchievement = styled.div.attrs({'data-widget': 'no-achievement'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-size    : calc(var(--font-size) * 1.2);
	font-weight  : var(--font-demi-bold);
	font-variant : petite-caps;
	min-height   : var(--tall-height);
	white-space  : nowrap;
	opacity      : 0.5;
`;