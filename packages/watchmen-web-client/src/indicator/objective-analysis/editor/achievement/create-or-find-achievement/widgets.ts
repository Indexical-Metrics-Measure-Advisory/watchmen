import styled from 'styled-components';

export const CreateOrFindContainer = styled.div.attrs({'data-widget': 'achievement-create-or-find'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 250px auto auto auto auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	margin-top            : var(--margin);
	font-size             : calc(var(--font-size) * 1.2);
	> div[data-widget=achievement-dropdown] {
		min-width : 250px;
	}
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