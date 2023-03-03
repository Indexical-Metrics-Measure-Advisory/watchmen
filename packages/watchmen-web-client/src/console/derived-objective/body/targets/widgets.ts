import styled from 'styled-components';

export const TargetsContainer = styled.div.attrs({'data-widget': 'derived-objective-targets'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, minmax(300px, 1fr));
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
`;
export const TargetCard = styled.div.attrs({'data-widget': 'derived-objective-target'})`
	display        : flex;
	position       : relative;
	flex-direction : column;
	padding        : calc(var(--margin) / 2) var(--margin);
	border-radius  : calc(var(--border-radius) * 2);
	box-shadow     : var(--shadow);
	transition     : all 300ms ease-in-out;
	&[data-breakdown-visible=true] {
		display               : grid;
		grid-template-columns : 1fr auto auto auto auto;
		grid-column           : span 3;
		align-items           : center;
		> div:first-child {
			grid-column  : 1;
			margin-right : var(--marign);
		}
		> span {
			grid-template-columns : repeat(2, auto 1fr);
			margin                : 0 var(--marign) 0 0;
		}
	}
	&:hover {
		box-shadow : var(--hover-shadow);
	}
`;
export const TargetName = styled.div.attrs({'data-widget': 'derived-objective-target-name'})`
	display      : flex;
	position     : relative;
	grid-column  : span 3;
	align-items  : center;
	font-size    : 1.4em;
	font-weight  : var(--font-bold);
	font-variant : petite-caps;
	min-height   : calc(var(--height) * 1.5);
	opacity      : 0.8;
	> span:nth-child(2) {
		flex-grow : 1;
	}
`;
export const TargetIndex = styled.span.attrs({'data-widget': 'derived-objective-target-index'})`
	font-size    : 0.5em;
	opacity      : 0.7;
	margin-right : calc(var(--margin) / 4);
	margin-top   : 0.4em;
`;
export const TargetValueRow = styled.span.attrs({'data-widget': 'derived-objective-target-value-row'})`
	display               : grid;
	position              : relative;
	align-items           : center;
	grid-template-columns : repeat(2, 80px 1fr);
	grid-column-gap       : calc(var(--margin) / 2);
	margin                : 0 calc(var(--margin) / -2);
	padding               : 0 calc(var(--margin) / 2);
	border-radius         : var(--border-radius);
	transition            : background-color 300ms ease-in-out;
	&[data-which=current] {
		font-size : 1.5em;
		> span[data-widget=derived-objective-target-value-label],
		> span[data-widget=derived-objective-target-value] {
			height : calc(var(--height) * 1.5);
		}
		> span[data-widget=derived-objective-target-value-label]:nth-child(3) {
			justify-content : flex-end;
			font-size       : 0.7em;
		}
	}
	&:not([data-which=current]) {
		opacity : 0.9;
	}
	&:hover {
		background-color : var(--hover-color);
	}
`;
export const TargetValueLabel = styled.span.attrs({'data-widget': 'derived-objective-target-value-label'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-size    : 1.1em;
	font-weight  : var(--font-demo-bold);
	font-variant : petite-caps;
	font-family  : var(--title-font-family);
	height       : var(--height);
	&[data-failed=true] {
		grid-column : span 3;
	}
`;
export const TargetValue = styled.span.attrs({'data-widget': 'derived-objective-target-value'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-size    : 1.1em;
	font-weight  : var(--font-demo-bold);
	font-variant : petite-caps;
	height       : var(--height);
	> svg {
		margin-left : calc(var(--margin) / 4);
	}
`;
export const ValuePlaceholder = styled.span.attrs({'data-widget': 'derived-objective-target-value'})``