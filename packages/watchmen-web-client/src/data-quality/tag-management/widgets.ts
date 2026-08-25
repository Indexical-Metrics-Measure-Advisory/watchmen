import {Input} from '@/widgets/basic/input';
import {InputLines} from '@/widgets/basic/input-lines';
import {TooltipButton} from '@/widgets/basic/tooltip-button';
import {TupleSearchBarContainer} from '@/widgets/tuple-workbench/tuple-search-bar/widgets';
import styled from 'styled-components';

export const TagSearchBarContainer = styled(TupleSearchBarContainer)`
	margin : var(--margin) calc(var(--margin) / 2) calc(var(--margin) / 2);
`;

export const TagCardGrid = styled.div.attrs({'data-widget': 'tag-card-grid'})`
	display               : grid;
	flex-grow             : 1;
	min-height            : 0;
	align-content         : start;
	overflow-y            : auto;
	grid-template-columns : repeat(3, calc((100% - var(--margin)) / 3));
	grid-column-gap       : calc(var(--margin) / 2);
	grid-row-gap          : calc(var(--margin) / 2);
	padding               : 0 calc(var(--margin) / 2) var(--margin);
`;

export const TagNoData = styled.div.attrs({'data-widget': 'tag-no-data'})`
	display         : flex;
	align-items     : center;
	justify-content : center;
	padding         : var(--margin) 0;
	grid-column     : span 3;
	font-family     : var(--title-font-family);
	font-weight     : var(--font-demi-bold);
	font-size       : 1.4em;
	opacity         : 0.5;
`;

export const TagCardColorDot = styled.div.attrs({'data-widget': 'tag-card-color-dot'})<{ $color: string }>`
	width         : 12px;
	height        : 12px;
	border-radius : 3px;
	background    : ${props => props.$color};
	flex-shrink   : 0;
	margin-right  : calc(var(--margin) / 4);
`;

export const TagCardDeleteButton = styled(TooltipButton).attrs({'data-widget': 'tag-card-delete-button'})`
	align-self : start;
	width      : var(--height);
	padding    : 0;
	&:hover {
		color : var(--danger-color);
	}
`;

// tag editor

export const TagEditorField = styled.div.attrs({'data-widget': 'tag-editor-field'})`
	display        : flex;
	flex-direction : column;
	&:not(:last-child) {
		margin-bottom : calc(var(--margin) / 2);
	}
`;

export const TagEditorInput = styled(Input).attrs({'data-widget': 'tag-editor-input'})`
	width : 100%;
`;

export const TagEditorInputLines = styled(InputLines).attrs({'data-widget': 'tag-editor-input-lines'})`
	width : 100%;
`;

export const TagEditorRequiredHint = styled.span.attrs({'data-widget': 'tag-editor-required-hint'})`
	color      : var(--danger-color);
	font-size  : 0.8em;
	margin-top : 2px;
`;

export const TagEditorColorPalette = styled.div.attrs({'data-widget': 'tag-editor-color-palette'})`
	display    : flex;
	flex-wrap  : wrap;
	gap        : 6px;
	margin-top : calc(var(--margin) / 4);
`;

export const TagEditorColorSwatch = styled.div.attrs({'data-widget': 'tag-editor-color-swatch'})<{
	$color: string;
	$selected: boolean
}>`
	width         : 24px;
	height        : 24px;
	border-radius : 4px;
	background    : ${props => props.$color};
	cursor        : pointer;
	border        : ${props => props.$selected ? '2px solid var(--font-color)' : '2px solid transparent'};
	transform     : ${props => props.$selected ? 'scale(1.1)' : 'scale(1)'};
	transition    : all 150ms ease;
`;

export const TagEditorColorInput = styled(Input).attrs({'data-widget': 'tag-editor-color-input'})`
	width      : 120px;
	margin-top : calc(var(--margin) / 4);
`;
