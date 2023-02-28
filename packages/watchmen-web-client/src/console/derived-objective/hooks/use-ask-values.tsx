import {
	ObjectiveFactor,
	ObjectiveFactorValues,
	ObjectiveTarget,
	ObjectiveTargetValues,
	ObjectiveValues
} from '@/services/data/tuples/objective-types';
import {useEffect, useState} from 'react';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';

interface Values {
	fetched: boolean;
	data?: ObjectiveValues;
}

export const useValuesFetched = () => {
	const {on, off} = useObjectiveEventBus();
	const [values, setValues] = useState<Values>({fetched: false});
	useEffect(() => {
		const onValuesFetched = (values: ObjectiveValues) => setValues({fetched: true, data: values});
		on(ObjectiveEventTypes.VALUES_FETCHED, onValuesFetched);
		return () => {
			off(ObjectiveEventTypes.VALUES_FETCHED, onValuesFetched);
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