import {RoundDwarfButton} from '@/widgets/basic/button';
import {HEADER_HEIGHT} from '@/widgets/basic/constants';
import {DialogBody} from '@/widgets/dialog/widgets';
import styled from 'styled-components';

export const FactorsTableButton = styled(RoundDwarfButton).attrs({'data-widget': 'factors-table-button'})`
	align-self   : center;
	justify-self : flex-start;
`;

export const FactorsTableContainer = styled.div.attrs({'data-widget': 'factors-table'})`
	grid-column    : span 2;
	display        : flex;
	flex-direction : column;
	font-size      : 0.8em;
	// editor in grid layout, 30% 70%, column gap is 32px, table is second column in editor.
	margin-left    : calc((100% + var(--margin)) / 0.7 * 0.3 * -1 - var(--margin));
	margin-bottom  : var(--margin);
`;

export const FactorsTableHeaderContainer = styled.div.attrs({'data-widget': 'factors-table-header'})`
	display     : flex;
	align-items : center;
	height      : ${HEADER_HEIGHT}px;
	margin      : 0 calc(var(--margin) / -2);
	> svg {
		min-width : var(--margin);
	}
	> input {
		margin-left   : calc(var(--margin) * -1);
		padding-left  : var(--margin);
		border-radius : 0;
		border        : 0;
		border-bottom : var(--border);
		width         : 100%;
		//&::placeholder {
		//	font-variant : petite-caps;
		//}
	}
`;
export const FactorsTableBodyContainer = styled.div.attrs({'data-widget': 'factors-table-body'})`
	display        : flex;
	flex-direction : column;
	position       : relative;
	margin         : 0 calc(var(--margin) / -2) calc(var(--margin) / 2);
	padding        : 0 calc(var(--margin) / 2);
`;
export const FactorsTableBodyPageableContainer = styled.div.attrs({'data-widget': 'enum-items-table-body-pageable'})`
	display     : flex;
	position    : relative;
	align-items : center;
	height      : calc(${HEADER_HEIGHT}px * 1.5);
	margin      : 0 calc(var(--margin) / -2);
	> span {
		margin-right : calc(var(--margin) / 2);
		font-variant : petite-caps;
	}
	> div[data-widget=dropdown] {
		width : 150px;
	}
`;

export const FactorsTableFooter = styled.div.attrs({'data-widget': 'factors-table-footer'})`
	display         : flex;
	align-items     : center;
	justify-content : flex-end;
	height          : ${HEADER_HEIGHT}px;
	> button:not(:first-child) {
		margin-left : calc(var(--margin) / 3);
	}
`;
const DIALOG_MARGIN = 'var(--margin) * 1.5';
const DIALOG_LABEL_HEIGHT = 'var(--line-height)';
const TABLE_HEADER_HEIGHT = 'var(--height) + var(--border-width)';
const TABLE_MARGIN = 'var(--margin) / 2';
const FOOTER_HEIGHT = 'var(--height)';
export const PICKER_DIALOG_HEIGHT = '70vh';

export const PickerDialogBody = styled(DialogBody)`
	flex-direction : column;
	margin-bottom  : calc(${TABLE_MARGIN});
`;

export const PickerTableHeader = styled.div`
	display               : grid;
	position              : relative;
	grid-template-columns : 40px 60px 120px 1fr;
	border-bottom         : var(--border);
	height                : calc(${TABLE_HEADER_HEIGHT});
	min-height            : calc(${TABLE_HEADER_HEIGHT});
`;
export const PickerTableHeaderCell = styled.div`
	display      : flex;
	align-items  : center;
	height       : var(--height);
	font-weight  : var(--font-bold);
	font-variant : petite-caps;
	padding      : 0 calc(var(--margin) / 4);
	> div[data-checked=true] {
		color        : var(--primary-color);
		border-color : var(--primary-color);
	}
	> div[data-checked=false] {
		color        : var(--warn-color);
		border-color : var(--warn-color);
	}
	> input {
		border-top    : 0;
		border-left   : 0;
		border-right  : 0;
		border-radius : 0;
		height        : calc(var(--height) * 0.8);
		width         : 100%;
		padding       : 0;
		margin-bottom : -1px;
		margin-left   : calc(var(--margin) / 2);
	}
`;
export const PickerTableBody = styled.div.attrs({'data-v-scroll': ''})`
	display    : block;
	position   : relative;
	overflow-y : auto;
	max-height : calc(${PICKER_DIALOG_HEIGHT} - ${DIALOG_MARGIN} - ${DIALOG_LABEL_HEIGHT} - (${TABLE_HEADER_HEIGHT}) - ${TABLE_MARGIN} - ${FOOTER_HEIGHT});
`;
export const PickerTableBodyRow = styled.div.attrs<{ columns?: number }>(({columns = 4}) => {
	return {
		style: {
			gridTemplateColumns: columns === 4 ? '40px 60px 120px 1fr' : '40px 60px 120px 1fr auto'
		}
	};
})<{ columns?: number }>`
	display  : grid;
	position : relative;
	&:nth-child(2n) {
		background-color : var(--grid-rib-bg-color);
	}
	&:hover {
		background-color : var(--hover-color);
	}
`;
export const PickerTableBodyCell = styled.div`
	display     : flex;
	position    : relative;
	align-items : center;
	height      : var(--height);
	padding     : 0 calc(var(--margin) / 4);
	> div[data-checked=true] {
		color        : var(--primary-color);
		border-color : var(--primary-color);
	}
	> div[data-checked=false] {
		color        : var(--warn-color);
		border-color : var(--warn-color);
	}
	> input {
		border        : 0;
		border-radius : 0;
		width         : 100%;
		padding-left  : 0;
		&:hover {
			border-bottom       : var(--border);
			border-bottom-color : var(--primary-color);
		}
	}
`;
