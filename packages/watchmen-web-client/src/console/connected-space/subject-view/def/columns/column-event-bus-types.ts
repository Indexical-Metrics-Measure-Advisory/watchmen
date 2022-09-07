import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';

export enum ColumnEventTypes {
	ALIAS_CHANGED = 'alias-changed',
	ARITHMETIC_CHANGED = 'arithmetic-changed',
	RENDERER_CHANGED = 'renderer-changed',
	POSITION_CHANGED = 'position-changed',
	CONTENT_CHANGED = 'content-changed'
}

export interface ColumnEventBus {
	fire(type: ColumnEventTypes.ALIAS_CHANGED, column: SubjectDataSetColumn): this;
	on(type: ColumnEventTypes.ALIAS_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;
	off(type: ColumnEventTypes.ALIAS_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;

	fire(type: ColumnEventTypes.ARITHMETIC_CHANGED, column: SubjectDataSetColumn): this;
	on(type: ColumnEventTypes.ARITHMETIC_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;
	off(type: ColumnEventTypes.ARITHMETIC_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;

	fire(type: ColumnEventTypes.RENDERER_CHANGED, column: SubjectDataSetColumn): this;
	on(type: ColumnEventTypes.RENDERER_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;
	off(type: ColumnEventTypes.RENDERER_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;

	fire(type: ColumnEventTypes.POSITION_CHANGED, column: SubjectDataSetColumn): this;
	on(type: ColumnEventTypes.POSITION_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;
	off(type: ColumnEventTypes.POSITION_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;

	fire(type: ColumnEventTypes.CONTENT_CHANGED, column: SubjectDataSetColumn): this;
	on(type: ColumnEventTypes.CONTENT_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;
	off(type: ColumnEventTypes.CONTENT_CHANGED, listener: (column: SubjectDataSetColumn) => void): this;
}