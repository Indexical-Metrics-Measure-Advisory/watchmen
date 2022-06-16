import {FactorId} from '@/services/data/tuples/factor-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	isTimePeriodMeasure,
	TimePeriodMeasure,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumnId} from '@/services/data/tuples/subject-types';
import {DropdownOption} from '@/widgets/basic/types';

export const buildTimePeriodOptionsOnTopic = (topic: TopicForIndicator): Array<DropdownOption> => {
	return (topic.factors || []).filter(factor => {
		const measures = tryToTransformToMeasures(factor);
		return measures.some(measure => isTimePeriodMeasure(measure));
	}).map(factor => {
		return {
			value: factor.factorId,
			label: factor.label || factor.name || 'Noname Factor'
		};
	});
};

export const buildTimePeriodOptionsOnSubject = (subject: SubjectForIndicator): Array<DropdownOption> => {
	return (subject.dataset.columns || []).filter(column => {
		const measures = tryToTransformColumnToMeasures(column, subject);
		return measures.some(measure => isTimePeriodMeasure(measure));
	}).map(column => {
		return {
			value: column.columnId,
			label: column.alias || 'Noname Factor'
		};
	});
};

const TimeMeasureMethodSort: Record<TimePeriodMeasure, number> = {
	[MeasureMethod.YEAR]: 1,
	[MeasureMethod.HALF_YEAR]: 2,
	[MeasureMethod.QUARTER]: 3,
	[MeasureMethod.MONTH]: 4,
	[MeasureMethod.HALF_MONTH]: 5,
	[MeasureMethod.TEN_DAYS]: 6,
	[MeasureMethod.WEEK_OF_YEAR]: 7,
	[MeasureMethod.WEEK_OF_MONTH]: 8,
	[MeasureMethod.HALF_WEEK]: 9,
	[MeasureMethod.DAY_OF_MONTH]: 10,
	[MeasureMethod.DAY_OF_WEEK]: 11,
	[MeasureMethod.DAY_KIND]: 12,
	[MeasureMethod.HOUR]: 13,
	[MeasureMethod.HOUR_KIND]: 14,
	[MeasureMethod.AM_PM]: 15
};
export const tryToGetTopTimeMeasure = (measures: Array<MeasureMethod>): TimePeriodMeasure | undefined => {
	return measures.filter(isTimePeriodMeasure).sort((m1, m2) => {
		return TimeMeasureMethodSort[m1] - TimeMeasureMethodSort[m2];
	})[0];
};
export const tryToGetTopTimeMeasureByTopic = (topic?: TopicForIndicator, factorId?: FactorId): TimePeriodMeasure | undefined => {
	if (topic == null || factorId == null) {
		return (void 0);
	}
	// eslint-disable-next-line
	const factor = (topic?.factors || []).find(factor => factor.factorId == factorId);
	if (factor != null) {
		return tryToGetTopTimeMeasure(tryToTransformToMeasures(factor));
	} else {
		return (void 0);
	}
};
export const tryToGetTopTimeMeasureBySubject = (subject?: SubjectForIndicator, columnId?: SubjectDataSetColumnId): TimePeriodMeasure | undefined => {
	if (subject == null || columnId == null) {
		return (void 0);
	}
	// eslint-disable-next-line
	const column = (subject.dataset.columns || []).find(column => column.columnId == columnId);
	if (column != null) {
		return tryToGetTopTimeMeasure(tryToTransformColumnToMeasures(column, subject));
	} else {
		return (void 0);
	}
};