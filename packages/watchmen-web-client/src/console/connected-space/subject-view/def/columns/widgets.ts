import {CheckBox} from '@/widgets/basic/checkbox';
import {DROPDOWN_Z_INDEX} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import styled from 'styled-components';

export const ColumnsContainer = styled.div.attrs<{ active: boolean }>(({active}) => {
	return {
		'data-widget': 'subject-def-columns',
		'data-v-scroll': '',
		style: {
			paddingRight: active ? (void 0) : 0,
			overflowY: active ? (void 0) : 'hidden'
		}
	};
}) <{ active: boolean }>`
	display        : flex;
	position       : relative;
	flex-direction : column;
	overflow-y     : auto;
	overflow-x     : hidden;
	border-right   : var(--border);
`;
export const ColumnsEditContainer = styled.div.attrs<{ visible: boolean }>(({visible}) => {
	return {
		'data-widget': 'subject-def-columns-edit',
		style: {
			display: visible ? (void 0) : 'none'
		}
	};
})<{ visible: boolean }>`
	display        : flex;
	position       : relative;
	flex-grow      : 1;
	flex-direction : column;
	padding        : calc(var(--margin) / 2) var(--margin) 0 0;
`;
export const ColumnsBottomGap = styled.div.attrs({'data-widget': 'subject-def-columns-bottom-gap'})`
	width      : 100%;
	height     : var(--margin);
	min-height : var(--margin);
`;
export const ColumnEditContainer = styled.div.attrs({'data-widget': 'subject-def-column-edit'})`
	display               : grid;
	grid-template-columns : var(--margin) 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	padding-bottom        : calc(var(--margin) / 4);
`;
export const ColumnIndex = styled.span.attrs({'data-widget': 'subject-def-column-index'})`
	position : relative;
	justify-self : end;
	line-height  : var(--param-height);
	font-variant : petite-caps;
	font-weight  : var(--font-bold);
	> span:nth-child(2) {
		display: inline-block;
		position : absolute;
		font-weight  : var(--font-boldest);
		color: var(--danger-color);
		transform: scale(0.7) translateY(-2px);
		transform-origin: right bottom;
	}
`;
export const ColumnEditWrapper = styled.div.attrs<{ shorten: boolean }>(({shorten}) => {
	return {
		'data-widget': 'subject-def-column-edit-wrapper',
		style: {
			gridTemplateColumns: shorten ? 'auto auto auto auto auto auto 1fr' : (void 0)
		}
	};
})<{ shorten: boolean }>`
	display               : grid;
	grid-template-columns : auto 1fr auto auto auto auto auto;
	grid-row-gap          : calc(var(--margin) / 4);
	position              : relative;
	align-self            : stretch;
	justify-self          : stretch;
	> div[data-widget="parameter-from-edit"] {
		border-top-right-radius    : 0;
		border-bottom-right-radius : 0;
	}
`;
export const AliasEdit = styled.div.attrs({'data-widget': 'subject-def-column-alias-edit'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	align-self   : stretch;
	justify-self : stretch;
	height       : var(--param-height);
	margin-left  : calc(var(--margin) / 2);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		left             : calc(var(--margin) / -2);
		top              : 50%;
		height           : 1px;
		width            : calc(var(--margin) / 2);
		background-color : var(--param-bg-color);
	}
`;
export const AliasLabel = styled.div.attrs({'data-widget': 'subject-def-column-alias-edit-label'})`
	display          : flex;
	align-items      : center;
	align-self       : stretch;
	justify-self     : stretch;
	background-color : var(--param-bg-color);
	font-variant     : petite-caps;
	font-weight      : var(--font-bold);
	padding          : 0 calc(var(--margin) / 4);
	border-radius    : calc(var(--param-height) / 2) 0 0 calc(var(--param-height) / 2);
	box-shadow       : var(--param-top-border), var(--param-bottom-border);
	cursor           : pointer;
`;
export const AliasEditInput = styled(Input).attrs({'data-widget': 'subject-def-column-alias-edit-input'})`
	width         : 200px;
	height        : var(--param-height);
	border        : 0;
	border-radius : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
	box-shadow    : var(--param-border);
	&:hover {
		z-index          : 1;
		background-color : var(--bg-color);
		box-shadow       : var(--primary-hover-shadow);
	}
`;
export const ArithmeticEdit = styled.div.attrs({'data-widget': 'subject-def-column-arithmetic-edit'})`
	display      : flex;
	position     : relative;
	align-items  : center;
	align-self   : stretch;
	justify-self : stretch;
	height       : var(--param-height);
	margin-left  : calc(var(--margin) / 2);
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		left             : calc(var(--margin) / -2);
		top              : 50%;
		height           : 1px;
		width            : calc(var(--margin) / 2);
		background-color : var(--param-bg-color);
	}
`;
export const ArithmeticLabel = styled.div.attrs({'data-widget': 'subject-def-column-arithmetic-edit-label'})`
	display          : flex;
	align-items      : center;
	align-self       : stretch;
	justify-self     : stretch;
	background-color : var(--param-bg-color);
	font-variant     : petite-caps;
	font-weight      : var(--font-bold);
	padding          : 0 calc(var(--margin) / 4);
	border-radius    : calc(var(--param-height) / 2) 0 0 calc(var(--param-height) / 2);
	box-shadow       : var(--param-top-border), var(--param-bottom-border);
	white-space      : nowrap;
`;
export const ArithmeticEditInput = styled(Dropdown).attrs({
	'data-widget': 'subject-def-column-arithmetic-edit-input',
	'data-no-border': true
})`
	width         : 150px;
	height        : var(--param-height);
	border        : 0;
	border-radius : 0 calc(var(--param-height) / 2) calc(var(--param-height) / 2) 0;
	box-shadow    : var(--param-border);
	&:hover {
		z-index          : 1;
		background-color : var(--bg-color);
		box-shadow       : var(--primary-hover-shadow);
	}
	> div[data-widget="dropdown-options-container"] {
		border     : 0;
		box-shadow : var(--param-border);
		> span {
			padding : 0 calc(var(--margin) / 2);
		}
	}
`;
export const RendererContainer = styled.div.attrs({'data-widget': 'subject-def-column-renderer'})`
	position : relative;
`;
export const RendererButton = styled.div.attrs<{ editorVisible: boolean }>(({editorVisible}) => {
	return {
		'data-widget': 'subject-def-column-renderer-button',
		style: {
			borderTopLeftRadius: editorVisible ? 0 : (void 0),
			borderBottomLeftRadius: editorVisible ? 0 : (void 0),
			boxShadow: editorVisible ? 'var(--param-border), var(--primary-shadow)' : (void 0)
		}
	};
})<{ editorVisible: boolean }>`
	display                   : flex;
	position                  : relative;
	align-self                : stretch;
	align-items               : center;
	justify-content           : center;
	height                    : var(--param-height);
	width                     : var(--param-height);
	padding                   : 0;
	margin-left               : calc(var(--margin) / 2);
	border-top-left-radius    : calc(var(--param-height) / 2);
	border-bottom-left-radius : calc(var(--param-height) / 2);
	color                     : var(--param-bg-color);
	box-shadow                : var(--param-border);
	cursor                    : pointer;
	transition                : color 300ms ease-in-out, box-shadow 300ms ease-in-out, border-radius 300ms ease-in-out;
	&:before {
		content          : '';
		display          : block;
		position         : absolute;
		left             : calc(var(--margin) / -2);
		top              : 50%;
		height           : 1px;
		width            : calc(var(--margin) / 2 - 1px);
		background-color : var(--param-bg-color);
	}
	&:hover {
		color      : var(--primary-color);
		box-shadow : var(--param-primary-border), var(--primary-hover-shadow);
		z-index    : 1
	}
	> svg {
		font-size : 0.8em;
	}
`;
export const RendererPanel = styled.div.attrs<{ visible: boolean; x: number; y: number; positionOnTop: boolean }>(
	({visible, x, y, positionOnTop}) => {
		return {
			'data-widget': 'subject-def-column-renderer-panel',
			style: {
				top: y ?? (void 0),
				left: x ?? (void 0),
				borderTopRightRadius: positionOnTop ? (void 0) : 0,
				borderBottomRightRadius: positionOnTop ? 0 : (void 0),
				clipPath: visible
					? 'polygon(-10px -1000px, calc(100% + 10px) -1000px, calc(100% + 10px) calc(100% + 1000px), -10px calc(100% + 1000px))'
					: (positionOnTop ? 'polygon(calc(100% + 10px) calc(100% + 10px), calc(100% + 10px) calc(100% + 10px), calc(100% + 10px) calc(100% + 10px), calc(100% + 10px) calc(100% + 10px))' : (void 0))
			}
		};
	})<{ visible: boolean; x: number; y: number; positionOnTop: boolean }>`
	display               : grid;
	position              : fixed;
	grid-template-columns : auto 1fr;
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 4);
	padding               : calc(var(--margin) / 2);
	background-color      : var(--bg-color);
	box-shadow            : var(--param-border), var(--primary-shadow);
	border-radius         : calc(var(--param-height) / 2);
	clip-path             : polygon(calc(100% + 10px) -10px, calc(100% + 10px) -10px, calc(100% + 10px) -10px, calc(100% + 10px) -10px);
	transition            : clip-path 300ms ease-in-out;
	z-index               : ${DROPDOWN_Z_INDEX};
`;
export const RendererItemLabel = styled.div.attrs({'data-widget': 'subject-def-column-renderer-item-label'})`
	display       : flex;
	align-items   : center;
	align-self    : stretch;
	justify-self  : stretch;
	font-variant  : petite-caps;
	font-weight   : var(--font-bold);
	padding       : 0 calc(var(--margin) / 4);
	border-radius : calc(var(--param-height) / 2) 0 0 calc(var(--param-height) / 2);
	white-space   : nowrap;
`;
export const RendererItemDropdown = styled(Dropdown).attrs({'data-widget': 'subject-def-column-renderer-item-dropdown'})`
	width : 150px;
`;
export const RendererItemCheckBox = styled(CheckBox).attrs({'data-widget': 'subject-def-column-renderer-item-checkbox'})`
	margin : calc((var(--height) - var(--checkbox-size)) / 2) 0;
`;
export const ColumnPositionContainer = styled.div.attrs({'data-widget': 'subject-def-column-position'})`
	display     : flex;
	position    : relative;
	margin-left : 1px;
	+ div[data-widget=delete-me-button] {
		margin-left               : 0;
		border-top-left-radius    : 0;
		border-bottom-left-radius : 0;
		background-color          : var(--bg-color);
		&:before {
			display : none;
		}
	}
`;
const ColumnPositionButton = styled.div`
	display          : flex;
	position         : relative;
	align-self       : stretch;
	align-items      : center;
	height           : var(--param-height);
	padding          : 0 calc(var(--margin) / 4);
	color            : var(--param-bg-color);
	background-color : var(--bg-color);
	box-shadow       : var(--param-border);
	cursor           : pointer;
	transition       : color 300ms ease-in-out, box-shadow 300ms ease-in-out;
	&:hover {
		color      : var(--primary-color);
		box-shadow : var(--param-primary-border), var(--primary-hover-shadow);
		z-index    : 1;
	}
	> svg {
		font-size : 0.8em;
	}
`;
export const ColumnPositionMoveUpButton = styled(ColumnPositionButton).attrs({'data-widget': 'subject-def-column-move-up-button'})`
`;
export const ColumnPositionMoveDownButton = styled(ColumnPositionButton).attrs({'data-widget': 'subject-def-column-move-down-button'})`
`;
