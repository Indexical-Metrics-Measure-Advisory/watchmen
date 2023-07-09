import {Convergence, ConvergenceAxisSegment, ConvergenceData} from '@/services/data/tuples/convergence-types';
import React from 'react';
import {LeadCorner, ValueCell, ValueColumnHeader, ValueRowHeader, ValuesGridContainer} from './widgets';

const computeCellCount = (count: number, segment: ConvergenceAxisSegment): number => {
	if (segment.segments == null || segment.segments.length === 0) {
		return count + 1;
	} else {
		return segment.segments.reduce(computeCellCount, count);
	}
};

export const ValuesGrid = (props: { convergence: Convergence, data: ConvergenceData }) => {
	const {data} = props;

	const rows = (data.yAxis || []).reduce(computeCellCount, 0);
	const columns = (data.xAxis || []).reduce(computeCellCount, 0);
	const hasLeadCorner = rows !== 0 && columns !== 0;
	const rowMovement = hasLeadCorner ? (data.xAxis || []).length + 1 : 1;
	const columnMovement = hasLeadCorner ? (data.yAxis || []).length + 1 : 1;

	const buildColumnHeader = (x: ConvergenceAxisSegment, row: number, col: number, last: boolean) => {
		return <ValueColumnHeader key={`${row} - ${col}`}
		                          row={row} column={col} columns={computeCellCount(0, x)} last={last}>
			{x.name}
		</ValueColumnHeader>;
	};
	const buildColumnHeaders = (series: Array<ConvergenceAxisSegment>, row: number, col: number, headers: Array<JSX.Element>, couldBeLast?: boolean) => {
		return series.reduce((all, x, index) => {
			const cbl = couldBeLast == null ? index === series.length - 1 : couldBeLast;
			all.headers.push(buildColumnHeader(x, row, all.col, cbl && index === series.length - 1));
			// still starts at give column index, row index increased
			buildColumnHeaders(x.segments || [], row + 1, all.col, headers, index === series.length - 1);
			all.col = computeCellCount(all.col, x);
			return all;
		}, {headers, col}).headers;
	};
	const columnHeaders = buildColumnHeaders(data.xAxis || [], 1, columnMovement, []);

	const buildRowHeader = (y: ConvergenceAxisSegment, row: number, col: number, last: boolean) => {
		return <ValueRowHeader key={`${row} - ${col}`}
		                       row={row} column={col} rows={computeCellCount(0, y)} last={last}>
			{y.name}
		</ValueRowHeader>;
	};
	const buildRowHeaders = (series: Array<ConvergenceAxisSegment>, row: number, col: number, headers: Array<JSX.Element>, couldBeLast?: boolean) => {
		return series.reduce((all, y, index) => {
			const cbl = couldBeLast == null ? index === series.length - 1 : couldBeLast;
			all.headers.push(buildRowHeader(y, all.row, col, cbl && index === series.length - 1));
			// still starts at give column index, row index increased
			buildRowHeaders(y.segments || [], all.row, col + 1, headers, index === series.length - 1);
			all.row = computeCellCount(all.row, y);
			return all;
		}, {headers, row}).headers;
	};
	const rowHeaders = buildRowHeaders(data.yAxis || [], rowMovement, 1, []);
	const lastValueRowIndex = (data.values || []).reduce((max, value) => Math.max(value.row, max), 0);
	const lastValueColumnIndex = (data.values || []).reduce((max, value) => Math.max(value.col, max), 0);
	const valueCells = (data.values || []).map(value => {
		return <ValueCell key={`${value.row} - ${value.col}`}
		                  row={value.row + rowMovement} column={value.col + columnMovement}
		                  lastRow={lastValueRowIndex === value.row} lastColumn={lastValueColumnIndex === value.col}>
			{value.failed ? 'N/A' : value.value}
		</ValueCell>;
	});

	return <ValuesGridContainer rows={rows} columns={columns}>
		{hasLeadCorner
			? <LeadCorner yCount={(data.xAxis || []).length} xCount={(data.yAxis || []).length}/>
			: null}
		{columnHeaders}
		{rowHeaders}
		{valueCells}
	</ValuesGridContainer>;
};
