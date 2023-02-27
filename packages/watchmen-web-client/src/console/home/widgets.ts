import {DwarfButton} from '@/widgets/basic/button';
import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const HomeBody = styled.div.attrs({'data-widgets': 'console-home-body'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, calc(33.333333% - var(--margin) / 3));
	grid-column-gap       : calc(var(--margin) * 2);
	grid-template-rows    : auto auto 1fr;
	grid-row-gap          : var(--margin);
`;
export const HomeSection = styled.div.attrs({'data-widget': 'console-home-section'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	&:nth-child(2) {
		grid-column : 1;
		grid-row    : 2;
	}
	&:last-child {
		grid-column : 2 / span 2;
		grid-row    : 1 / span 3;
	}
`;
export const HomeSectionHeader = styled.div.attrs({'data-widget': 'console-home-section-header'})`
	display         : flex;
	justify-content : space-between;
	align-items     : center;
`;
export const HomeSectionTitle = styled.div.attrs({'data-widget': 'console-home-section-title'})`
	display       : flex;
	position      : relative;
	align-items   : center;
	height        : 3em;
	padding-right : var(--margin);
	font-family   : var(--title-font-family);
	font-size     : 1.6em;
	font-weight   : var(--font-demi-bold);
`;
export const HomeSectionHeaderOperators = styled.div.attrs({'data-widget': 'console-home-section-header-operators'})`
	display     : flex;
	align-items : center;
	opacity     : 0.5;
	transition  : opacity 300ms ease-in-out;
	&:hover {
		opacity : 1;
	}
`;
export const HeaderButton = styled(DwarfButton).attrs({'data-widget': 'console-home-section-header-operators-button'})`
	&:not(:first-child) {
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
		&:after {
			content          : '';
			display          : block;
			position         : absolute;
			top              : 30%;
			left             : -0.5px;
			width            : 1px;
			height           : 40%;
			background-color : var(--bg-color);
		}
	}
	&:not(:last-child) {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
	}
`;
export const HomeSectionBody = styled.div.attrs<{ collapse: boolean, maxHeight?: number }>(
	({collapse, maxHeight}) => {
		return {
			'data-widget': 'console-home-section-body',
			style: {
				maxHeight: collapse ? 0 : (maxHeight || 2000),
				padding: collapse ? '0 calc(var(--margin) / 2)' : (void 0)
			}
		};
	})<{ collapse: boolean, maxHeight?: number }>`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(1, minmax(0, 1fr));
	grid-gap              : calc(var(--margin) / 2);
	margin                : calc(var(--margin) / -2);
	padding               : calc(var(--margin) / 2);
	overflow              : hidden;
	transition            : all 300ms ease-in-out;
`;
export const NoRecentUse = styled.div.attrs({'data-widgets': 'no-recent-use'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-variant : petite-caps;
	font-weight  : var(--font-demi-bold);
	font-size    : 1.2em;
	opacity      : 0.7;
`;
export const CardContainer = styled.div.attrs({'data-widget': 'card'})`
	display               : grid;
	grid-template-columns : var(--height) 1fr;
	grid-template-rows    : var(--height) 1fr;
	grid-row-gap          : calc(var(--margin) / 2);
	align-items           : center;
	padding               : calc(var(--margin) / 2) var(--margin);
	border-radius         : calc(var(--border-radius) * 2);
	box-shadow            : var(--shadow);
	cursor                : pointer;
	transition            : box-shadow 300ms ease-in-out;
	&:hover {
		box-shadow : var(--hover-shadow);
	}
	> svg {
		opacity : 0.5;
	}
`;
export const CardLastVisit = styled.div.attrs({'data-widget': 'card-last-visit'})`
	display      : flex;
	position     : relative;
	font-variant : petite-caps;
	opacity      : 0.5;
	min-height   : var(--height);
	align-items  : center;
`;
export const CardName = styled.div.attrs({'data-widget': 'card-name'})`
	grid-column : span 2;
	font-size   : 1.8em;
	font-weight : var(--font-demi-bold);
	font-family : var(--title-font-family);
	align-self  : start;
	opacity     : 0.7;
`;

export const SearchInput = styled(Input).attrs({'data-widget': 'search-input'})`
	border-width  : 0 0 1px 0;
	border-radius : 0;
	padding-left  : 0;
	padding-right : 0;
	border-color  : var(--border-color);
	font-size     : 1.2em;
	line-height   : 1.4em;
	width         : 100%;
	height        : var(--tall-height);
	transition    : all 300ms ease-in-out;
`;

export const SearchList = styled.div.attrs({
	'data-widget': 'search-list',
	'data-v-scroll': ''
})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(2, minmax(0, 1fr));
	grid-gap              : calc(var(--margin) / 2);
	margin                : calc(var(--margin) / -2);
	padding               : calc(var(--margin) / 2);
	overflow-y            : auto;
	max-height            : 600px;
`;