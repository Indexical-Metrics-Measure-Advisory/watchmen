import {Factor} from '@/services/data/tuples/factor-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {
	isTimePeriodMeasure,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {SubjectForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {MeasureMethodLabels} from '@/widgets/basic/measure-method-label';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {getValidRanges} from '../../utils/range';
import {MeasureMethodSort} from '../../utils/sort';

const isOneRangeOnly = (inspection?: Inspection): boolean => {
	const ranges = getValidRanges(inspection);
	if (ranges.length === 0) {
		return false;
	}
	return [...new Set(ranges.map(range => range.value))].length === 1;
};

const buildNoTimeMeasureOption = (): DropdownOption => {
	return {
		value: '',
		label: Lang.INDICATOR.INSPECTION.NO_TIME_MEASURE
	};
};

const buildFirstFactorAsTimeFactor = (inspection: Inspection, firstFactor?: Factor): Array<DropdownOption> => {
	if (firstFactor == null) {
		return [];
	}

	const available = !isOneRangeOnly(inspection)
		|| tryToTransformToMeasures(firstFactor).filter(measure => isDescendantOf(measure, inspection.timeRangeMeasure)).length !== 0;

	return available ? [{
		value: firstFactor.factorId,
		label: firstFactor.label || firstFactor.name || 'Noname Factor'
	}] : [];
};

const buildOtherFactorsAsTimeFactors = (topic: TopicForIndicator, firstFactor?: Factor): Array<DropdownOption> => {
	return (topic.factors || [])
		.filter(factor => factor !== firstFactor)
		.map(factor => ({factor, measures: tryToTransformToMeasures(factor)}))
		.filter(({measures}) => measures.some(measure => isTimePeriodMeasure(measure)))
		.map(({factor, measures}) => {
			return {
				factor,
				measures: measures.filter(measure => isTimePeriodMeasure(measure))
					.sort((m1, m2) => MeasureMethodSort[m1] - MeasureMethodSort[m2])
			};
		}).sort(({factor: f1}, {factor: f2}) => {
			return (f1.label || f1.name || '').localeCompare(f2.label || f2.name || '', void 0, {
				sensitivity: 'base',
				caseFirst: 'upper'
			});
		}).map(({factor}) => {
			return {value: factor.factorId, label: factor.label || factor.name || 'Noname Factor'};
		});
};

export const buildTimeFactorOptionsOnTopic = (inspection: Inspection, topic: TopicForIndicator, firstFactor?: Factor): Array<DropdownOption> => {
	if (topic == null) {
		return [];
	}

	return [
		buildNoTimeMeasureOption(),
		// measure on factor itself.
		// when filter is only one value, top time measure is not applicable since only one group will be addressed
		...buildFirstFactorAsTimeFactor(inspection, firstFactor),
		...buildOtherFactorsAsTimeFactors(topic, firstFactor)
	];
};

const buildFirstColumnAsTimeFactor = (inspection: Inspection, subject: SubjectForIndicator, firstColumn?: SubjectDataSetColumn): Array<DropdownOption> => {
	if (firstColumn == null) {
		return [];
	}

	const available = !isOneRangeOnly(inspection)
		|| tryToTransformColumnToMeasures(firstColumn, subject).filter(measure => isDescendantOf(measure, inspection.timeRangeMeasure)).length !== 0;

	return available ? [{
		value: firstColumn.columnId,
		label: firstColumn.alias || 'Noname Factor'
	}] : [];
};

const buildOtherColumnsAsTimeFactors = (subject: SubjectForIndicator, firstColumn?: SubjectDataSetColumn): Array<DropdownOption> => {
	return (subject.dataset.columns || [])
		.filter(column => column !== firstColumn)
		.map(column => {
			return {column, measures: tryToTransformColumnToMeasures(column, subject)};
		})
		.filter(({measures}) => measures.some(measure => isTimePeriodMeasure(measure)))
		.map(({column, measures}) => {
			return {
				column,
				measures: measures.filter(measure => isTimePeriodMeasure(measure))
					.sort((m1, m2) => MeasureMethodSort[m1] - MeasureMethodSort[m2])
			};
		}).sort(({column: c1}, {column: c2}) => {
			return (c1.alias || '').localeCompare(c2.alias || '', void 0, {
				sensitivity: 'base',
				caseFirst: 'upper'
			});
		}).map(({column}) => {
			return {value: column.columnId, label: column.alias || 'Noname Factor'};
		});
};

export const buildTimeFactorOptionsOnSubject = (inspection: Inspection, subject: SubjectForIndicator, firstColumn?: SubjectDataSetColumn): Array<DropdownOption> => {
	if (subject == null) {
		return [];
	}

	return [
		buildNoTimeMeasureOption(),
		// measure on factor itself.
		// when filter is only one value, top time measure is not applicable since only one group will be addressed
		...buildFirstColumnAsTimeFactor(inspection, subject, firstColumn),
		...buildOtherColumnsAsTimeFactors(subject, firstColumn)
	];
};

const isDescendantOf = (measure: MeasureMethod, ancestor?: MeasureMethod): boolean => {
	if (ancestor == null) {
		return true;
	}

	switch (ancestor) {
		case MeasureMethod.YEAR:
			return [MeasureMethod.HALF_YEAR, MeasureMethod.QUARTER, MeasureMethod.MONTH, MeasureMethod.WEEK_OF_YEAR].includes(measure);
		case MeasureMethod.MONTH:
			return [MeasureMethod.HALF_MONTH, MeasureMethod.WEEK_OF_MONTH, MeasureMethod.DAY_OF_MONTH].includes(measure);
		default:
			return false;
	}
};

export const buildTimeMeasureOptionsOnTopic = (inspection: Inspection, topic: TopicForIndicator, firstFactor?: Factor): Array<DropdownOption> => {
	if (topic == null) {
		return [];
	}

	const measureOnTimeFactorId = inspection.measureOnTimeFactorId;
	if (measureOnTimeFactorId == null) {
		return [];
	}

	// eslint-disable-next-line
	const factor = (topic.factors || []).find(factor => factor.factorId == measureOnTimeFactorId);
	if (factor == null) {
		return [];
	}
	let measures;
	if (factor === firstFactor) {
		measures = isOneRangeOnly(inspection)
			? tryToTransformToMeasures(firstFactor).filter(measure => isDescendantOf(measure, inspection.timeRangeMeasure))
			: tryToTransformToMeasures(firstFactor);
	} else {
		measures = tryToTransformToMeasures(factor);
	}

	return measures.map(measure => {
		return {
			value: measure,
			label: MeasureMethodLabels[measure]
		};
	});
};

export const buildTimeMeasureOptionsOnSubject = (inspection: Inspection, subject: SubjectForIndicator, firstColumn?: SubjectDataSetColumn): Array<DropdownOption> => {
	if (subject == null) {
		return [];
	}

	const measureOnTimeFactorId = inspection.measureOnTimeFactorId;
	if (measureOnTimeFactorId == null) {
		return [];
	}

	// eslint-disable-next-line
	const column = (subject.dataset.columns || []).find(column => column.columnId == measureOnTimeFactorId);
	if (column == null) {
		return [];
	}
	let measures;
	if (column === firstColumn) {
		measures = isOneRangeOnly(inspection)
			? tryToTransformColumnToMeasures(firstColumn, subject).filter(measure => isDescendantOf(measure, inspection.timeRangeMeasure))
			: tryToTransformColumnToMeasures(firstColumn, subject);
	} else {
		measures = tryToTransformColumnToMeasures(column, subject);
	}

	return measures.map(measure => {
		return {
			value: measure,
			label: MeasureMethodLabels[measure]
		};
	});
};