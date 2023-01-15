import {SAVE_TIMEOUT} from '@/services/constants';
import {askObjectiveValues} from '@/services/data/tuples/objective';
import {
	Objective,
	ObjectiveFactor,
	ObjectiveFactorValues,
	ObjectiveTarget,
	ObjectiveTargetValues,
	ObjectiveValues
} from '@/services/data/tuples/objective-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';

export const ObjectiveValuesHandler = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectivesEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [objective, saveQueue]);
	useEffect(() => {
		const onAskValues = () => {
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await askObjectiveValues(objective),
					(values: ObjectiveValues) => fire(ObjectivesEventTypes.VALUES_FETCHED, values));
			}, SAVE_TIMEOUT);
		};
		on(ObjectivesEventTypes.ASK_VALUES, onAskValues);
		return () => {
			off(ObjectivesEventTypes.ASK_VALUES, onAskValues);
		};
	}, [fireGlobal, on, off, fire, objective, saveQueue]);

	return <Fragment/>;
};

interface Values {
	fetched: boolean;
	data?: ObjectiveValues;
}

export const useValuesFetched = () => {
	const {on, off} = useObjectivesEventBus();
	const [values, setValues] = useState<Values>({fetched: false});
	useEffect(() => {
		const onValuesFetched = (values: ObjectiveValues) => setValues({fetched: true, data: values});
		on(ObjectivesEventTypes.VALUES_FETCHED, onValuesFetched);
		return () => {
			off(ObjectivesEventTypes.VALUES_FETCHED, onValuesFetched);
		};
	}, [on, off]);

	return {
		findTargetValues: (target: ObjectiveTarget): ObjectiveTargetValues | undefined => {
			if (!values.fetched) {
				return (void 0);
			} else {
				// eslint-disable-next-line
				return values.data?.targets?.find(values => values.uuid == target.uuid) ?? (void 0);
			}
		},
		findFactorValues: (factor: ObjectiveFactor): ObjectiveFactorValues | undefined => {
			if (!values.fetched) {
				return (void 0);
			} else {
				// eslint-disable-next-line
				return values.data?.factors?.find(values => values.uuid == factor.uuid) ?? (void 0);
			}
		}
	};
};