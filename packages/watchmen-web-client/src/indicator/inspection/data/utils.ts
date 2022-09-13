import {BucketId} from '@/services/data/tuples/bucket-types';
import {Factor, FactorId} from '@/services/data/tuples/factor-types';
import {IndicatorAggregateArithmetic, IndicatorAggregateArithmeticSort} from '@/services/data/tuples/indicator-types';
import {Inspection, InspectMeasureOn, InspectMeasureOnType} from '@/services/data/tuples/inspection-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn, SubjectDataSetColumnId} from '@/services/data/tuples/subject-types';
import {ReactNode} from 'react';
import {IndicatorForInspection} from '../inspection-event-bus-types';
import {Column, Columns, ColumnType} from '../types';

const findFactor = (topic: TopicForIndicator, factorId?: FactorId): Factor | undefined => {
	if (factorId == null) {
		return (void 0);
	}

	// eslint-disable-next-line
	return (topic.factors || []).find(factor => factor.factorId == factorId);
};

const findColumn = (subject: SubjectForIndicator, columnId?: SubjectDataSetColumnId): SubjectDataSetColumn | undefined => {
	if (columnId == null) {
		return (void 0);
	}

	// eslint-disable-next-line
	return (subject.dataset.columns || []).find(column => column.columnId == columnId);
};

const findBucket = (buckets: Array<QueryBucket>, bucketId?: BucketId): QueryBucket | undefined => {
	if (bucketId == null) {
		return (void 0);
	}

	// eslint-disable-next-line
	return buckets.find(bucket => bucket.bucketId == bucketId);
};

const buildColumnDef = (name: string, type: ColumnType): Column => {
	return {name, type};
};

const appendColumnDef = (columns: Columns, name: string, type: ColumnType) => {
	columns.push(buildColumnDef(name, type));
};

const asArithmeticName = (arithmetic: IndicatorAggregateArithmetic): string => {
	switch (arithmetic) {
		case IndicatorAggregateArithmetic.COUNT:
			return 'Count of';
		case IndicatorAggregateArithmetic.SUM:
			return 'Sum of';
		case IndicatorAggregateArithmetic.AVG:
			return 'Avg of';
		case IndicatorAggregateArithmetic.MAX:
			return 'Max of';
		case IndicatorAggregateArithmetic.MIN:
			return 'Min of';
		default:
			return '';
	}
};

const buildColumnForMeasureOnValue = (options: {
	measure: InspectMeasureOn;
	buckets: Array<QueryBucket>;
	columns: Array<Column>;
}) => {
	const {measure, buckets, columns} = options;

	const measureOnBucketId = measure.bucketId;
	if (measureOnBucketId == null) {
		// use naturally category, let column name to be factor name
		appendColumnDef(columns, 'Value', ColumnType.TEXT);
	} else {
		const bucket = findBucket(buckets, measureOnBucketId);
		appendColumnDef(columns, bucket?.name || 'Noname Bucket', ColumnType.TEXT);
	}
};
const buildColumnForMeasureOnOther = (options: {
	measure: InspectMeasureOn;
	topic?: TopicForIndicator;
	subject?: SubjectForIndicator;
	buckets: Array<QueryBucket>;
	columns: Columns;
}) => {
	const {measure, topic, subject, buckets, columns} = options;

	const measureOnFactorId = measure.factorId;
	if (topic != null) {
		const measureOnFactor = findFactor(topic, measureOnFactorId);
		if (measureOnFactor != null) {
			const measureOnBucketId = measure.bucketId;
			if (measureOnBucketId == null) {
				// use naturally category, let column name to be factor name
				appendColumnDef(columns, measureOnFactor.label || measureOnFactor.name || 'Noname Factor', ColumnType.TEXT);
			} else {
				const bucket = findBucket(buckets, measureOnBucketId);
				appendColumnDef(columns, bucket?.name || 'Noname Bucket', ColumnType.TEXT);
			}
		}
	} else if (subject != null) {
		const measureOnColumn = findColumn(subject, measureOnFactorId);
		if (measureOnColumn != null) {
			const measureOnBucketId = measure.bucketId;
			if (measureOnBucketId == null) {
				// use naturally category, let column name to be factor name
				appendColumnDef(columns, measureOnColumn.alias || 'Noname Factor', ColumnType.TEXT);
			} else {
				const bucket = findBucket(buckets, measureOnBucketId);
				appendColumnDef(columns, bucket?.name || 'Noname Bucket', ColumnType.TEXT);
			}
		}
	}
};
export const buildColumnDefs = (options: {
	inspection: Inspection;
	indicator: IndicatorForInspection;
	buckets: Array<QueryBucket>;
}): Columns => {
	const {inspection, indicator, buckets} = options;
	const {indicator: {factorId}, topic, subject} = indicator;

	const columns: Columns = [];

	let factorOrColumnName = 'Value';
	if (topic != null) {
		const factor = findFactor(topic, factorId);
		factorOrColumnName = factor?.label || factor?.name || 'Value';
	} else if (subject != null) {
		const column = findColumn(subject, factorId);
		factorOrColumnName = column?.alias || 'Value';
	}

	(inspection.measures || []).forEach(measure => {
		if (measure == null || measure.type == null || measure.type === InspectMeasureOnType.NONE) {
			// no measure
		} else if (measure.type === InspectMeasureOnType.VALUE) {
			buildColumnForMeasureOnValue({measure, buckets, columns});
		} else if (measure.type === InspectMeasureOnType.OTHER) {
			buildColumnForMeasureOnOther({measure, topic, subject, buckets, columns});
		}
	});

	if (inspection.measureOnTime != null) {
		if (topic != null) {
			const timeFactor = findFactor(topic, inspection.measureOnTimeFactorId);
			if (timeFactor != null) {
				appendColumnDef(columns, timeFactor.label || timeFactor.name || 'Noname Factor', ColumnType.TIME);
			}
		} else if (subject != null) {
			const timeColumn = findColumn(subject, inspection.measureOnTimeFactorId);
			if (timeColumn != null) {
				appendColumnDef(columns, timeColumn.alias || 'Noname Factor', ColumnType.TIME);
			}
		}
	}

	(inspection.aggregateArithmetics
		?? [(factorId == null ? IndicatorAggregateArithmetic.COUNT : IndicatorAggregateArithmetic.SUM)]
	).sort((a1, a2) => {
		return IndicatorAggregateArithmeticSort[a1] - IndicatorAggregateArithmeticSort[a2];
	}).forEach(arithmetic => {
		appendColumnDef(columns, `${asArithmeticName(arithmetic)} ${factorOrColumnName}`, ColumnType.NUMERIC);
	});

	return columns;
};

const NumberFormatter = new Intl.NumberFormat(undefined, {useGrouping: true});
export const formatCellValue = (value: any, column: Column): ReactNode => {
	if (value == null) {
		return null;
	}
	if (typeof value === 'string' && value.trim().length === 0) {
		return null;
	}

	if (column.type === ColumnType.TEXT) {
		return value;
	} else if (column.type === ColumnType.NUMERIC) {
		if (typeof value === 'number') {
			return NumberFormatter.format(value);
		} else {
			const v = NumberFormatter.format(Number(value));
			return v === 'NaN' ? null : v;
		}
	} else if (column.type === ColumnType.TIME) {
		return value;
	}
};