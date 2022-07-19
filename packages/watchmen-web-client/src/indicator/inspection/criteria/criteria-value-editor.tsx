import {
	IndicatorCriteria,
	IndicatorCriteriaOnBucket,
	IndicatorCriteriaOnExpression
} from '@/services/data/tuples/indicator-criteria-types';
import {isCriteriaValueVisible, showInputForValue} from '@/services/data/tuples/indicator-criteria-utils';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {ChangeEvent, useEffect, useRef} from 'react';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {IndicatorCriteriaDefData} from './types';
import {InspectionCriteriaValue} from './widgets';

const InputEditor = (props: {
	inspection: Inspection;
	criteria: IndicatorCriteria;
}) => {
	const {inspection, criteria} = props;

	const inputRef = useRef<HTMLInputElement>(null);
	const {fire} = useInspectionEventBus();
	const forceUpdate = useForceUpdate();

	const onInputValueChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		(criteria as IndicatorCriteriaOnExpression).value = value;
		forceUpdate();
		fire(InspectionEventTypes.INDICATOR_CRITERIA_CHANGED, inspection, criteria);
		fire(InspectionEventTypes.SAVE_INSPECTION, inspection, noop);
	};

	return <Input value={(criteria as IndicatorCriteriaOnExpression).value || ''}
	              onChange={onInputValueChanged} ref={inputRef}/>;
};

export const CriteriaValueEditor = (props: {
	inspection: Inspection;
	criteria: IndicatorCriteria;
	defData: IndicatorCriteriaDefData;
}) => {
	const {inspection, criteria, defData} = props;

	const {on, off, fire} = useInspectionEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onCriteriaChanged = (anInspection: Inspection, aCriteria: IndicatorCriteria) => {
			if (anInspection !== inspection || aCriteria !== criteria) {
				return;
			}
			forceUpdate();
		};
		on(InspectionEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
		on(InspectionEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, onCriteriaChanged);
		return () => {
			off(InspectionEventTypes.INDICATOR_CRITERIA_FACTOR_CHANGED, onCriteriaChanged);
			off(InspectionEventTypes.INDICATOR_CRITERIA_ARITHMETIC_CHANGED, onCriteriaChanged);
		};
	}, [on, off, forceUpdate, inspection, criteria]);

	if (!isCriteriaValueVisible(criteria)) {
		return null;
	}

	const onBucketSegmentChanged = (option: DropdownOption) => {
		(criteria as IndicatorCriteriaOnBucket).bucketSegmentName = option.value as string;
		fire(InspectionEventTypes.INDICATOR_CRITERIA_CHANGED, inspection, criteria);
		fire(InspectionEventTypes.SAVE_INSPECTION, inspection, noop);
		forceUpdate();
	};

	// noinspection DuplicatedCode
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

	return <InspectionCriteriaValue>
		{isInputShown
			? <InputEditor inspection={inspection} criteria={criteria}/>
			: <Dropdown value={(criteria as IndicatorCriteriaOnBucket).bucketSegmentName}
			            options={getBucketSegmentOptions}
			            onChange={onBucketSegmentChanged}/>}
	</InspectionCriteriaValue>;
};