import styled from 'styled-components';

export const AchievementEdit = styled.div`
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
					&:first-child {
						padding-top: calc(var(--margin) / 2);
					}
					&:last-child {
						width: unset;
					}
				}
			}
		}
	` : ''}
`;
