import {FactorId} from '@/services/data/tuples/factor-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {Inspection} from '@/services/data/tuples/inspection-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect} from 'react';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {useVisibleOnII} from '../use-visible-on-ii';
import {InspectionLabel} from '../widgets';
import {
	buildTimeFactorOptionsOnSubject,
	buildTimeFactorOptionsOnTopic,
	buildTimeMeasureOptionsOnSubject,
	buildTimeMeasureOptionsOnTopic
} from './utils';
import {TimeMeasureOnContainer, TimeMeasureOnDropdown, TimePeriodDropdown} from './widgets';

export const TimeMeasureOn = () => {
	const {on, off, fire} = useInspectionEventBus();
	const {visible, inspection, indicator} = useVisibleOnII();
	const forceUpdate = useForceUpdate();

	useEffect(() => {
		const onTimeFactorChanged = (anInspection: Inspection) => {
			if (anInspection !== inspection) {
				return;
			}
			forceUpdate();
		};
		on(InspectionEventTypes.TIME_RANGE_ON_CHANGED, onTimeFactorChanged);
		on(InspectionEventTypes.TIME_RANGE_VALUES_CHANGED, onTimeFactorChanged);
		return () => {
			off(InspectionEventTypes.TIME_RANGE_ON_CHANGED, onTimeFactorChanged);
			off(InspectionEventTypes.TIME_RANGE_VALUES_CHANGED, onTimeFactorChanged);
		};
	}, [on, off, forceUpdate, inspection]);

	if (!visible) {
		return null;
	}

	const onTimeFactorChange = (option: DropdownOption) => {
		const factorId = option.value === '' ? null : (option.value as FactorId);
		// eslint-disable-next-line
		if (inspection?.measureOnTimeFactorId == factorId) {
			return;
		}

		if (factorId == null) {
			delete inspection?.measureOnTime;
			delete inspection?.measureOnTimeFactorId;
		} else {
			inspection!.measureOnTimeFactorId = factorId;
		}

		fire(InspectionEventTypes.TIME_MEASURE_CHANGED, inspection!);
		forceUpdate();
	};
	const onTimeMeasureChange = (option: DropdownOption) => {
		const measure = option.value as MeasureMethod;
		// eslint-disable-next-line
		if (inspection?.measureOnTime === measure) {
			return;
		}
		inspection!.measureOnTime = measure;
		fire(InspectionEventTypes.TIME_MEASURE_CHANGED, inspection!);
		forceUpdate();
	};

	const {topic, subject} = indicator!;
	let timeFactorOptions: Array<DropdownOption> = [];
	let timeMeasureOptions: Array<DropdownOption> = [];
	if (topic != null) {
		const factor = inspection?.timeRangeFactorId == null
			? (void 0)
			// eslint-disable-next-line
			: (topic.factors || []).find(factor => factor.factorId == inspection.timeRangeFactorId);
		timeFactorOptions = buildTimeFactorOptionsOnTopic(inspection!, topic, factor);
		timeMeasureOptions = buildTimeMeasureOptionsOnTopic(inspection!, topic, factor);
	} else if (subject != null) {
		const column = inspection?.timeRangeFactorId == null
			? (void 0)
			// eslint-disable-next-line
			: (subject.dataset.columns || []).find(column => column.columnId == inspection.timeRangeFactorId);
		timeFactorOptions = buildTimeFactorOptionsOnSubject(inspection!, subject, column);
		timeMeasureOptions = buildTimeMeasureOptionsOnSubject(inspection!, subject, column);
	}

	return <TimeMeasureOnContainer>
		<InspectionLabel>{Lang.INDICATOR.INSPECTION.TIME_MEASURE_ON_LABEL}</InspectionLabel>
		<TimePeriodDropdown value={inspection?.measureOnTimeFactorId ?? ''} options={timeFactorOptions}
		                    onChange={onTimeFactorChange}
		                    please={Lang.PLAIN.DROPDOWN_PLACEHOLDER}/>
		{inspection?.measureOnTimeFactorId == null
			? null
			: <TimeMeasureOnDropdown value={inspection?.measureOnTime ?? ''} options={timeMeasureOptions}
			                         onChange={onTimeMeasureChange}
			                         please={Lang.PLAIN.DROPDOWN_PLACEHOLDER}/>}
	</TimeMeasureOnContainer>;
};