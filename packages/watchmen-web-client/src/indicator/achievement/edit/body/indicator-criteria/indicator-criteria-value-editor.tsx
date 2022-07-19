import {
	Achievement,
	AchievementIndicator
} from '@/services/data/tuples/achievement-types';
import {
	IndicatorCriteria,
	IndicatorCriteriaOnBucket,
	IndicatorCriteriaOnExpression
} from '@/services/data/tuples/indicator-criteria-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {tryToTransformColumnToMeasures, tryToTransformToMeasures} from '@/services/data/tuples/indicator-utils';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {useTooltip} from '@/widgets/basic/tooltip';
import {DropdownOption, TooltipAlignment} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {ChangeEvent, useEffect, useRef} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorCriteriaDefData} from '../types';
import {
	getAvailableTimeRangeOnColumn,
	getAvailableTimeRangeOnFactor,
	getTimeRangePlaceholder,
	isCriteriaValueVisible,
	showInputForValue
} from './utils';
import {IndicatorCriteriaValue} from './widgets';

const InputEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	criteria: IndicatorCriteria;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, criteria, defData} = props;

	const inputRef = useRef<HTMLInputElement>(null);
	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	let useTrigger: boolean = false;
	let hasYear: boolean = false;
	let hasMonth: boolean = false;
	if (defData.topic != null) {
		// eslint-disable-next-line
		const factor = (defData.topic?.factors || []).find(factor => factor.factorId == criteria.factorId);
		const {year, month} = getAvailableTimeRangeOnFactor(factor);
		hasYear = year;
		hasMonth = month;
		useTrigger = (() => {
			if (defData.topic == null) {
				return false;
			}
			// eslint-disable-next-line
			const factor = (defData.topic.factors || []).find(({factorId}) => factorId == criteria.factorId);
			if (factor == null) {
				return false;
			}
			const measures = tryToTransformToMeasures(factor);
			if (measures.includes(MeasureMethod.YEAR) || measures.includes(MeasureMethod.MONTH)) {
				return getTimeRangePlaceholder(year, month) != null;
			} else {
				return false;
			}
		})();
	} else if (defData.subject != null) {
		// eslint-disable-next-line
		const column = (defData.subject.dataset.columns || []).find(column => column.columnId == criteria.factorId);
		const {year, month} = getAvailableTimeRangeOnColumn(column, defData.subject);
		hasYear = year;
		hasMonth = month;
		useTrigger = (() => {
			if (defData.subject == null) {
				return false;
			}
			// eslint-disable-next-line
			const column = (defData.subject.dataset.columns || []).find(({columnId}) => columnId == criteria.factorId);
			if (column == null) {
				return false;
			}
			const measures = tryToTransformColumnToMeasures(column, defData.subject);
			if (measures.includes(MeasureMethod.YEAR) || measures.includes(MeasureMethod.MONTH)) {
				return getTimeRangePlaceholder(year, month) != null;
			} else {
				return false;
			}
		})();
	}
	const tooltipTrigger = useTooltip<HTMLInputElement>({
		use: useTrigger,
		tooltip: getTimeRangePlaceholder(hasYear, hasMonth),
		target: inputRef,
		alignment: TooltipAlignment.RIGHT
	});

	const onInputValueChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		(criteria as IndicatorCriteriaOnExpression).value = value;
		forceUpdate();
		fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, achievement, achievementIndicator);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};

	return <Input value={(criteria as IndicatorCriteriaOnExpression).value || ''}
	              onChange={onInputValueChanged} {...tooltipTrigger} ref={inputRef}/>;
};

export const IndicatorCriteriaValueEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
	criteria: IndicatorCriteria;
	defData: IndicatorCriteriaDefData;
}) => {
	const {achievement, achievementIndicator, criteria, defData} = props;

	const {fire} = useAchievementEventBus();
	const {on: onEdit, off: offEdit, fire: fireEdit} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onCriteriaChanged = (aAchievement: Achievement, aAchievementIndicator: AchievementIndicator, aCriteria: IndicatorCriteria) => {
			if (aAchievement !== achievement || aAchievementIndicator !== achievementIndicator || aCriteria !== criteria) {
				return;
			}
			forceUpdate();
		};
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
		onEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, onCriteriaChanged);
		return () => {
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
			offEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, onCriteriaChanged);
		};
	}, [onEdit, offEdit, forceUpdate, achievement, achievementIndicator, criteria]);

	if (!isCriteriaValueVisible(criteria)) {
		return null;
	}

	const onBucketSegmentChanged = (option: DropdownOption) => {
		(criteria as IndicatorCriteriaOnBucket).bucketSegmentName = option.value as string;
		fireEdit(AchievementEditEventTypes.INDICATOR_CRITERIA_CHANGED, achievement, achievementIndicator);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		forceUpdate();
	};

	const isInputShown = showInputForValue(criteria);
	const getBucketSegmentOptions: Array<DropdownOption> = isInputShown
		? []
		: (() => {
			const bucketId = (criteria as IndicatorCriteriaOnBucket).bucketId;
			// eslint-disable-next-line
			const bucket = bucketId == null ? null : [...defData.valueBuckets, ...defData.measureBuckets].find(bucket => bucket.bucketId == bucketId);
			if (bucket != null) {
				return (bucket.segments || []).map(segment => {
					return {value: segment.name, label: segment.name || 'Noname Bucket Segment'};
				});
			} else {
				return [];
			}
		})();

	return <IndicatorCriteriaValue>
		{isInputShown
			? <InputEditor achievement={achievement} achievementIndicator={achievementIndicator}
			               criteria={criteria} defData={defData}/>
			: <Dropdown value={(criteria as IndicatorCriteriaOnBucket).bucketSegmentName}
			            options={getBucketSegmentOptions}
			            onChange={onBucketSegmentChanged}/>}
	</IndicatorCriteriaValue>;
};