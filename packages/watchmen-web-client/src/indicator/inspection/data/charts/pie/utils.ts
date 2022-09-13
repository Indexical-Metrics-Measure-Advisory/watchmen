import {RowOfAny} from '@/services/data/types';
import {ColumnIndexMap, isColumnIndexAssigned} from '../chart-utils';

export interface SingleMeasureNames {
	columnIndexes: Array<number>;
	data: RowOfAny;
}

export const joinColumnValues = (row: RowOfAny, columnIndexes: Array<number>): string => {
	return columnIndexes.map(columnIndex => row[columnIndex]).join(', ');
};

export const buildSingleMeasureNames = (data: Array<RowOfAny>, columnIndexMap: ColumnIndexMap): SingleMeasureNames => {
	// noinspection DuplicatedCode
	if (isColumnIndexAssigned(columnIndexMap.timeGrouping)) {
		const columnIndex = columnIndexMap.timeGrouping;
		return {
			columnIndexes: [columnIndex],
			data: [...new Set(data.map(row => row[columnIndex]))].sort((t1, t2) => {
				return `${t1 || ''}`.localeCompare(`${t2 || ''}`, void 0, {numeric: true});
			})
		};
	} else {
		const columnIndexes = columnIndexMap.bucketOn;
		return {
			columnIndexes,
			data: [...new Set(data.map(row => joinColumnValues(row, columnIndexes)))].sort((t1, t2) => {
				return `${t1 || ''}`.localeCompare(`${t2 || ''}`, void 0, {numeric: true});
			})
		};
	}
};

export const buildTimeGroupingNames = (data: Array<RowOfAny>, columnIndexMap: ColumnIndexMap): SingleMeasureNames => {
	return {
		columnIndexes: [columnIndexMap.timeGrouping],
		data: [...new Set(data.map(row => row[columnIndexMap.timeGrouping]))].sort((t1, t2) => {
			return `${t1 || ''}`.localeCompare(`${t2 || ''}`, void 0, {numeric: true});
		})
	};
};

export const buildBucketOnNames = (data: Array<RowOfAny>, columnIndexMap: ColumnIndexMap): SingleMeasureNames => {
	return {
		columnIndexes: columnIndexMap.bucketOn,
		data: [...new Set(data.map(row => joinColumnValues(row, columnIndexMap.bucketOn)))]
	};
};
