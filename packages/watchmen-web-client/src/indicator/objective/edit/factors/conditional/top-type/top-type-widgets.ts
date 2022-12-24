import styled from 'styled-components';

export const TopTypeContainer = styled.div.attrs({'data-widget': 'objective-factor-filter-top-type'})`
	display          : flex;
	align-items      : center;
	align-self       : center;
	justify-self     : start;
	font-variant     : petite-caps;
	font-weight      : var(--font-demi-bold);
	height           : var(--param-height);
	background-color : var(--param-bg-color);
	border-radius    : calc(var(--param-height) / 2);
	box-shadow       : var(--param-border);
	cursor           : pointer;
	overflow         : hidden;
	outline          : none;
	transition       : box-shadow 300ms ease-in-out;
	&:hover {
		box-shadow : var(--primary-hover-shadow);
	}
`;
export const TopTypeOption = styled.div.attrs<{ active: boolean, expanded: boolean }>(({active, expanded}) => {
	return {
		'data-widget': 'objective-factor-filter-top-type-option',
		style: {
			display: (expanded || active) ? (void 0) : 'none',
			backgroundColor: active ? (void 0) : 'var(--bg-color)',
			boxShadow: active ? (void 0) : 'var(--param-left-border)'
		}
	};
})<{ active: boolean, expanded: boolean }>`
	display      : flex;
	align-items  : center;
	font-variant : petite-caps;
	font-weight  : var(--font-demi-bold);
	height       : var(--param-height);
	padding      : 0 calc(var(--margin) / 2);
	transition   : color 300ms ease-in-out;
	&:hover {
		color : ${({active}) => active ? (void 0) : 'var(--warn-color)'};
	}
`;
export const TopTypeButton = styled.div.attrs({'data-widget': 'objective-factor-filter-top-type-button'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	padding         : 0 calc(var(--margin) / 2);
	width           : 20px;
	height          : 20px;
	&[data-expanded=true] {
		&:before {
			display : none;
		}
		> svg {
			transform  : rotateZ(180deg);
			transition : transform 300ms ease-in-out;
		}
	}
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 25%;
		left             : 0;
		width            : 1px;
		height           : 50%;
		background-color : var(--invert-color);
		opacity          : 0.5;
	}
	> svg {
		font-size : 0.8em;
	}
`;

export const VeryTopTypeContainer = styled.div.attrs({'data-widget': 'objective-factor-filter-very-top-type'})`
	display          : flex;
	align-items      : center;
	align-self       : center;
	justify-self     : start;
	font-variant     : petite-caps;
	height           : var(--param-height);
	background-color : var(--bg-color);
	border-radius    : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
	box-shadow       : var(--param-border);
	cursor           : pointer;
	overflow         : hidden;
	outline          : none;
	transition       : box-shadow 300ms ease-in-out;
	&:hover {
		box-shadow : var(--primary-hover-shadow);
	}
`;
export const VeryTopTypeOption = styled.div.attrs<{ active: boolean, expanded: boolean }>(({active, expanded}) => {
	return {
		'data-widget': 'objective-factor-filter-very-top-type-option',
		style: {
			display: (expanded || active) ? (void 0) : 'none'
		}
	};
})<{ active: boolean, expanded: boolean }>`
	display          : flex;
	position         : relative;
	align-items      : center;
	font-variant     : petite-caps;
	height           : var(--param-height);
	padding          : 0 calc(var(--margin) / 2);
	background-color : ${({expanded, active}) => (expanded && active) ? 'var(--param-bg-color)' : (void 0)};
	transition       : color 300ms ease-in-out;
	&:hover {
		color : var(--warn-color);
	}
	&:nth-child(3):before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 25%;
		left             : 0;
		width            : 1px;
		height           : 50%;
		background-color : var(--param-bg-color);
	}
`;
export const VeryTopTypeButton = styled.div.attrs({'data-widget': 'objective-factor-filter-very-top-type-button'})`
	display         : flex;
	position        : relative;
	align-items     : center;
	justify-content : center;
	padding         : 0 calc(var(--margin) / 2);
	width           : 20px;
	height          : 20px;
	&[data-expanded=true] {
		> svg {
			transform  : rotateZ(180deg);
			transition : transform 300ms ease-in-out;
		}
	}
	&[data-expanded=false] {
		margin-left : calc(var(--margin) / -2);
		:before {
			display : none;
		}
	}
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		top              : 25%;
		left             : 0;
		width            : 1px;
		height           : 50%;
		background-color : var(--param-bg-color);
	}
	> svg {
		font-size : 0.8em;
	}
`;