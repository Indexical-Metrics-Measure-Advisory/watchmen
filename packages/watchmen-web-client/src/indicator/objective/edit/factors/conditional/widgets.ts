import styled from 'styled-components';

export const FilterContainer = styled.div.attrs<{ isTop: boolean }>(({isTop}) => {
	return {
		'data-widget': 'objective-factor-filter',
		style: {
			marginLeft: isTop ? 'calc(var(--margin) / -2)' : (void 0),
			marginRight: isTop ? 'calc(var(--margin) / 2)' : (void 0)
		}
	};
})<{ isTop: boolean }>`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr;
	grid-row-gap          : calc(var(--margin) / 4);
	grid-auto-rows        : minmax(var(--height), auto);
	grid-column           : 3 / span 2;
`;
export const IndicatorNotReady = styled.div.attrs({'data-widget': 'objective-factor-filter-indicator-not-ready'})`
	display          : flex;
	position         : relative;
	align-items      : center;
	justify-self     : start;
	font-variant     : petite-caps;
	background-color : var(--bg-color);
	padding          : 0 calc(var(--margin) / 2);
	height           : var(--param-height);
	width            : 300px;
	margin-top       : calc(var(--height) / 2 - var(--param-height) / 2);
	border-radius    : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
	box-shadow       : var(--param-border);
`;
export const FilterHeader = styled.div.attrs({'data-widget': 'objective-factor-filter-header'})`
	display : flex;
`;
export const RemoveMeButton = styled.div.attrs({'data-widget': 'remove-me-button'})`
	display         : flex;
	position        : relative;
	align-self      : center;
	align-items     : center;
	justify-content : center;
	width           : var(--param-height);
	height          : var(--param-height);
	margin-left     : calc(var(--margin) / 2);
	border-radius   : 100%;
	box-shadow      : var(--param-border);
	opacity         : 0.7;
	cursor          : pointer;
	transition      : box-shadow 300ms ease-in-out, color 300ms ease-in-out, opacity 300ms ease-in-out;
	&:before {
		content                   : '';
		display                   : block;
		position                  : absolute;
		bottom                    : 50%;
		left                      : calc(var(--margin) / -2);
		width                     : calc(var(--margin) / 2);
		height                    : 1px;
		background-color          : transparent;
		border-left               : var(--border);
		border-bottom             : var(--border);
		border-bottom-left-radius : var(--border-radius);
		z-index                   : -1;
	}
	&:hover {
		color      : var(--danger-color);
		opacity    : 1;
		box-shadow : var(--param-danger-border), var(--danger-hover-shadow);
	}
`;