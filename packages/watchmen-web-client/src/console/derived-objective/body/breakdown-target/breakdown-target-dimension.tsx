import {
	BreakdownDimension,
	BreakdownDimensionType,
	BreakdownTarget,
	DerivedObjective
} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {isNotBlank} from '@/services/utils';
import {Button} from '@/widgets/basic/button';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {MeasureMethodLabels} from '@/widgets/basic/measure-method-label';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {DefForBreakdownDimension, DimensionCandidate} from '../types';
import {buildMeasureOnOptions} from '../utils';
import {useBreakdownTargetEventBus} from './breakdown-target-event-bus';
import {BreakdownTargetEventTypes} from './breakdown-target-event-bus-types';
import {BreakdownTargetDimensionContainer} from './widgets';

interface DimensionOnOption extends DropdownOption {
	onSelect: () => void;
}

export const BreakdownTargetDimension = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget; dimension: BreakdownDimension;
	def: DefForBreakdownDimension;
}) => {
	const {def: {indicator, topic, subject, buckets}, breakdown, dimension} = props;

	const {fire} = useBreakdownTargetEventBus();
	const forceUpdate = useForceUpdate();

	const onFactorOrColumnChanged = (option: DropdownOption) => {
		// eslint-disable-next-line eqeqeq
		if (dimension.factorOrColumnId == option.value) {
			return;
		}
		dimension.factorOrColumnId = option.value;
		const {onValue, buckets, timeMeasureMethods} = option as DimensionCandidate;
		if (onValue) {
			dimension.type = BreakdownDimensionType.VALUE;
			delete dimension.bucketId;
			delete dimension.timeMeasureMethod;
		} else if (buckets.length !== 0) {
			dimension.type = BreakdownDimensionType.BUCKET;
			dimension.bucketId = buckets[0].bucketId;
			delete dimension.timeMeasureMethod;
		} else if (timeMeasureMethods.length !== 0) {
			dimension.type = BreakdownDimensionType.TIME_RELATED;
			delete dimension.bucketId;
			dimension.timeMeasureMethod = timeMeasureMethods[0];
		} else {
			// never occurred, just guard data
			dimension.type = BreakdownDimensionType.VALUE;
			delete dimension.bucketId;
			delete dimension.timeMeasureMethod;
		}
		if (!(breakdown.dimensions || []).includes(dimension)) {
			fire(BreakdownTargetEventTypes.ADD_DIMENSION, dimension);
		} else {
			forceUpdate();
			fire(BreakdownTargetEventTypes.DIMENSION_CHANGED, dimension);
		}
	};
	const onDimensionOnChanged = (option: DropdownOption) => {
		(option as DimensionOnOption).onSelect();
		forceUpdate();
		fire(BreakdownTargetEventTypes.DIMENSION_CHANGED, dimension);
	};
	const onDeleteClicked = () => {
		fire(BreakdownTargetEventTypes.REMOVE_DIMENSION, dimension);
	};

	const factorOrColumnOptions = buildMeasureOnOptions({
		indicator: indicator!, topic, subject, buckets
	});
	const selected = isNotBlank(dimension.factorOrColumnId);
	const buildDimensionOnOptions = (): Array<DimensionOnOption> => {
		if (!selected) {
			return [];
		}
		// eslint-disable-next-line eqeqeq
		const candidate = factorOrColumnOptions.find(option => option.value == dimension.factorOrColumnId);
		if (candidate == null) {
			return [];
		}
		const {onValue, buckets, timeMeasureMethods} = candidate;
		const options: Array<DimensionOnOption> = [];
		if (onValue) {
			options.push({
				value: '', label: Lang.CONSOLE.DERIVED_OBJECTIVE.VALUE_AS_DIMENSION, onSelect: () => {
					dimension.type = BreakdownDimensionType.VALUE;
					delete dimension.bucketId;
					delete dimension.timeMeasureMethod;
				}
			});
		}
		buckets.forEach(bucket => {
			options.push({
				value: `bucket-${bucket.bucketId}`, label: bucket.name || 'Noname Bucket', onSelect: () => {
					dimension.type = BreakdownDimensionType.BUCKET;
					dimension.bucketId = bucket.bucketId;
					delete dimension.timeMeasureMethod;
				}
			});
		});
		timeMeasureMethods.forEach(timeMeasureMethod => {
			options.push({
				value: `time-${timeMeasureMethod}`, label: MeasureMethodLabels[timeMeasureMethod], onSelect: () => {
					dimension.type = BreakdownDimensionType.TIME_RELATED;
					delete dimension.bucketId;
					dimension.timeMeasureMethod = timeMeasureMethod;
				}
			});
		});
		return options;
	};
	const dimensionOnOptions = buildDimensionOnOptions();
	const please = (breakdown.dimensions ?? []).length === 0
		? Lang.CONSOLE.DERIVED_OBJECTIVE.ADD_FIRST_BREAKDOWN_DIMENSION
		: Lang.CONSOLE.DERIVED_OBJECTIVE.ADD_BREAKDOWN_DIMENSION;
	const askDimensionOn = () => {
		if (dimension.type === BreakdownDimensionType.VALUE) {
			return '';
		} else if (dimension.type === BreakdownDimensionType.BUCKET) {
			return `bucket-${dimension.bucketId}`;
		} else if (dimension.type === BreakdownDimensionType.TIME_RELATED) {
			return `time-${dimension.timeMeasureMethod}`;
		}
	};
	const dimensionOn = askDimensionOn();

	return <BreakdownTargetDimensionContainer>
		<Dropdown value={dimension.factorOrColumnId} options={factorOrColumnOptions}
		          onChange={onFactorOrColumnChanged}
		          please={please}/>
		{selected
			? <>
				<Dropdown value={dimensionOn} options={dimensionOnOptions}
				          onChange={onDimensionOnChanged}/>
				<Button onClick={onDeleteClicked}>
					<FontAwesomeIcon icon={ICON_DELETE}/>
				</Button>
			</>
			: null}
	</BreakdownTargetDimensionContainer>;
};