import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const AchievementEdit = styled.div.attrs({'data-widget': 'achievement-edit'})`
	display  : block;
	position : relative;
`;

export const Assistant = styled.div.attrs<{ viewMode: boolean }>({'data-widget': 'achievement-view-mode-assistant'})<{ viewMode: boolean }>`
	${({viewMode}) => viewMode ? `
		+ div[data-widget=achievement-palette-container] {
			margin-left: calc(var(--margin) / -2);
			margin-right: calc(var(--margin) / -2);
			width: calc(100% + var(--margin));
			> div[data-widget=achievement-palette] {
				> div[data-widget=achievement-palette-column] {
					margin-left: calc(var(--margin) / 2);
					margin-right: calc(var(--margin) / 2);
					padding-left: 0;
					padding-right: 0;
					&[data-widget=achievement-palette-column]:first-child {
						padding-top: calc(var(--margin) / 2);
					}
					&[data-widget=achievement-palette-column]:last-child {
						width: unset;
						padding-bottom: 0;
					}
				}
			}
		}
		~ div[data-widget=achievement-plugins] {
			margin-top: calc(var(--margin) / -2);
		}
	` : ''}
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