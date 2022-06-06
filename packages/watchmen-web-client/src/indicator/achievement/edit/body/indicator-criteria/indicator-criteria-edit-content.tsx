import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {isMeasureBucket} from '@/services/data/tuples/bucket-utils';
import {Factor} from '@/services/data/tuples/factor-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	findTopicAndFactor,
	isTimePeriodMeasure,
	tryToTransformColumnToMeasures,
	tryToTransformToMeasures
} from '@/services/data/tuples/indicator-utils';
import {SubjectDataSetColumn} from '@/services/data/tuples/subject-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {v4} from 'uuid';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {Expandable, useIndicatorPartExpandable} from '../use-indicator-part-expandable';
import {IndicatorCriteriaEditor} from './indicator-criteria-editor';
import {IndicatorNameEditor} from './indicator-name-editor';
import {IndicatorCriteriaEditContentContainer} from './widgets';

export const IndicatorCriteriaEditContent = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	indicator: Indicator;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, indicator, defData} = props;

	const {on: onEdit, off: offEdit} = useAchievementEditEventBus();
	const {containerRef, expanded} = useIndicatorPartExpandable({
		achievement,
		achievementIndicator,
		expandable: Expandable.CRITERIA
	});
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onIndicatorCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator) {
				return;
			}
			forceUpdate();
		};
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		return () => {
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ADDED, onIndicatorCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_REMOVED, onIndicatorCriteriaChanged);
		};
	});

	const criteria = (achievementIndicator.criteria || []);
	const displayCriteria = [...criteria, {}];

	let criteriaFactorOptions: Array<DropdownOption> = [];
	if (defData.topic != null) {
		// factors which defined as buckets in indicator and factors which has time measure
		// can be used as achievement indicator criteria
		const isFactorSupported = (factor: Factor): boolean => {
			const measures = tryToTransformToMeasures(factor);
			if (measures.some(isTimePeriodMeasure)) {
				return true;
			}
			if (factor.enumId != null) {
				// enumeration factor
				return true;
			} else {
				// not an enumeration factor, at least one bucket is matched
				return factor.enumId == null && defData.measureBuckets.some(bucket => isMeasureBucket(bucket) && measures.includes(bucket.measure));
			}
		};
		criteriaFactorOptions = (defData.topic.factors || []).filter(factor => {
			// eslint-disable-next-line
			return indicator.factorId == factor.factorId || isFactorSupported(factor);
		}).sort((f1, f2) => {
			return (f1.label || f1.name || '').localeCompare(f2.label || f2.name || '', void 0, {
				sensitivity: 'base',
				caseFirst: 'upper'
			});
		}).map(factor => {
			return {
				value: factor.factorId,
				label: factor.label || factor.name || 'Noname Factor'
			};
		});
	} else if (defData.subject != null) {
		const isColumnSupported = (column: SubjectDataSetColumn): boolean => {
			const measures = tryToTransformColumnToMeasures(column, defData.subject!);
			if (measures.some(isTimePeriodMeasure)) {
				return true;
			}
			const {factor} = findTopicAndFactor(column, defData.subject);
			const enumId = factor != null ? factor.enumId : (void 0);
			if (enumId != null) {
				// enumeration factor
				return true;
			} else {
				// not an enumeration factor, at least one bucket is matched
				return enumId == null && defData.measureBuckets.some(bucket => isMeasureBucket(bucket) && measures.includes(bucket.measure));
			}
		};
		criteriaFactorOptions = (defData.subject.dataset.columns || []).filter(column => {
			// eslint-disable-next-line
			return indicator.factorId == column.columnId || isColumnSupported(column);
		}).sort((c1, c2) => {
			return (c1.alias || '').localeCompare(c2.alias || '', void 0, {
				sensitivity: 'base',
				caseFirst: 'upper'
			});
		}).map(column => {
			return {
				value: column.columnId,
				label: column.alias || 'Noname Factor'
			};
		});
	}

	return <IndicatorCriteriaEditContentContainer expanded={expanded} ref={containerRef}>
		<IndicatorNameEditor achievement={achievement} achievementIndicator={achievementIndicator}/>
		{displayCriteria.map(criteria => {
			return <IndicatorCriteriaEditor achievement={achievement} achievementIndicator={achievementIndicator}
			                                criteria={criteria}
			                                indicator={indicator} factorCandidates={criteriaFactorOptions}
			                                defData={defData}
			                                key={v4()}/>;
		})}
	</IndicatorCriteriaEditContentContainer>;
};