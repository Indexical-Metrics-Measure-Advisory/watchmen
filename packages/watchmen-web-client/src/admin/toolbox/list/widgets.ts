import {FixWidthPage} from '@/widgets/basic/page';
import styled from 'styled-components';

export const ToolboxPage = styled(FixWidthPage)`
	max-width : 1000px;
`;

export const ToolboxCards = styled.div.attrs({'data-widget': 'toolbox-cards'})`
	display               : grid;
	grid-column           : span 2;
	grid-template-columns : repeat(3, calc((100% - var(--margin)) / 3));
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
	padding-top           : calc(var(--margin) / 2);
`;
export const ToolboxCard = styled.div.attrs({'data-widget': 'toolbox-card'})`
	display        : flex;
	flex-direction : column;
	padding        : calc(var(--margin) / 2) var(--margin);
	position       : relative;
	border-radius  : calc(var(--border-radius) * 2);
	box-shadow     : var(--shadow);
	cursor         : pointer;
	transition     : all 300ms ease-in-out;
	&:hover {
		box-shadow : var(--hover-shadow);
	}
`;
export const ToolboxCardTitle = styled.div.attrs({'data-widget': 'toolbox-card-title'})`
	display     : flex;
	align-items : center;
	font-family : var(--title-font-family);
	font-size   : 1.6em;
	> span {
		flex-grow     : 1;
		word-break    : break-word;
		overflow      : hidden;
		text-overflow : ellipsis;
	}
`;
export const ToolboxCardDescription = styled.div.attrs({'data-widget': 'toolbox-card-description'})`
	display     : flex;
	flex-grow   : 1;
	position    : relative;
	word-break  : break-word;
	font-size   : 0.9em;
	opacity     : 0.8;
	margin-top  : calc(var(--margin) / 2);
	min-height  : 3.5em;
	line-height : 1.5em;
`;
