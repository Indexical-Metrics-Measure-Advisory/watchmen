import styled from 'styled-components';

export const VariablesContainer = styled.div.attrs({'data-widget': 'derived-objective-variables'})`
	display               : grid;
	position              : relative;
	grid-template-columns : repeat(3, 150px 1fr);
	grid-column-gap       : var(--margin);
	grid-row-gap          : calc(var(--margin) / 2);
	margin-bottom         : var(--margin);
	transition            : height 300ms ease-in-out;
	&[data-visible=false] {
		height        : 0;
		margin-bottom : 0;
		overflow      : hidden;
	}
`;
export const VariablesTitle = styled.div.attrs({'data-widget': 'derived-objective-variables-title'})`
	display      : flex;
	position     : relative;
	grid-column  : span 6;
	align-items  : center;
	font-size    : 1.4em;
	font-weight  : var(--font-bold);
	font-variant : petite-caps;
	min-height   : var(--tall-height);
	opacity      : 0.8;
`;
export const VariableName = styled.div.attrs({'data-widget': 'derived-objective-variable-name'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	font-variant : petite-caps;
	opacity      : 0.8;
`;
export const RangeVariableContainer = styled.div.attrs({'data-widget': 'derived-objective-variable-range'})`
	display               : grid;
	position              : relative;
	grid-template-columns : auto 1fr auto 1fr auto;
	align-items           : center;
	> button {
		background-color : transparent;
		font-weight      : var(--font-bold);
		font-variant     : petite-caps;
		overflow         : hidden;
		border           : var(--border);
		&:before {
			content          : '';
			display          : block;
			position         : absolute;
			top              : 0;
			left             : 0;
			width            : 100%;
			height           : 100%;
			background-color : var(--border-color);
			opacity          : 0.3;
		}
	}
	> button:first-child {
		border-radius : var(--border-radius) 0 0 var(--border-radius);
	}
	> input {
		border-radius : 0;
		border-left   : 0;
		border-right  : 0;
		flex-grow     : 1;
	}
	> span {
		display      : flex;
		position     : relative;
		padding      : 0 calc(var(--margin) / 2);
		height       : var(--height);
		align-items  : center;
		font-variant : petite-caps;
		font-weight  : var(--font-bold);
		border       : var(--border);
		&:before {
			content          : '';
			display          : block;
			position         : absolute;
			top              : 0;
			left             : 0;
			width            : 100%;
			height           : 100%;
			background-color : var(--border-color);
			opacity          : 0.3;
		}
	}
	> input:nth-child(4) {
		padding-right : calc(var(--margin) / 2);
	}
	> button:last-child {
		border-radius : 0 var(--border-radius) var(--border-radius) 0;
	}
`;
export const RangeVariableConjunction = styled.span``;
export const BucketVariableContainer = styled.div.attrs({'data-widget': 'derived-objective-variable-bucket'})`
	display               : grid;
	position              : relative;
	grid-template-columns : 1fr 1fr;
	align-items           : center;
`;