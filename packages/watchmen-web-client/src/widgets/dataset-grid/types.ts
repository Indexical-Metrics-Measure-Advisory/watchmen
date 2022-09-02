import {DataSetPage} from '@/services/data/console/dataset';

export enum ColumnSortBy {
	NONE = 'none',
	ASC = 'asc',
	DESC = 'desc'
}

export enum ColumnAlignment {
	LEFT = 'left',
	CENTER = 'center',
	RIGHT = 'right'
}

export enum ColumnFormat {
	NONE = 'none',
	USE_GROUP = '#,##0',
	USE_GROUP_1 = '#,##0.0',
	USE_GROUP_2 = '#,##0.00',
	USE_GROUP_3 = '#,##0.000',
	USE_GROUP_4 = '#,##0.0000',
	USE_GROUP_5 = '#,##0.00000',
	USE_GROUP_6 = '#,##0.000000',
}

export interface ColumnRenderer {
	alignment: ColumnAlignment;
	format: ColumnFormat;
	highlightNegative: boolean;
}

export interface ColumnDef {
	fixed: boolean;
	width: number;
	index: number;
}

export interface DataColumnDef extends ColumnDef {
	name: string;
	sort: ColumnSortBy;
	renderer?: ColumnRenderer;
}

export interface SequenceColumnDef extends ColumnDef {
}

export interface ColumnDefs {
	fixed: Array<DataColumnDef>;
	data: Array<DataColumnDef>;
}

export type DataPage = DataSetPage;

export interface DataSetState extends DataPage {
	loaded: boolean;
	columnDefs: ColumnDefs;
}

export interface SimulateDataSetState extends DataPage {
	enabled: boolean;
	columnDefs: ColumnDefs;
}

export interface TableSelection {
	inFixTable: boolean;
	row: number;
	rowTop: number;
	rowHeight: number;

	column: number;
	columnLeft: number;
	columnWidth: number;
	columnHeight: number;

	verticalScroll: number;
	horizontalScroll: number;
}

export interface SelectionRef {
	selection: () => TableSelection;
}

export interface DragColumnState {
	left: number;
	height: number;
	startRowIndex: number;
	endRowIndex: number;
	firstRowOffsetY: number;
	movementX: number;
}
