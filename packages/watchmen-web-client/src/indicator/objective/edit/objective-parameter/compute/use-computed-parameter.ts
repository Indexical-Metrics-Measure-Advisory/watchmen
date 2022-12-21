import {ComputedObjectiveParameter, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';

export const useDelegateComputedParameterChildChangedToMe = (parameter: ComputedObjectiveParameter): (() => void) => {
	const {on, off, fire} = useParameterEventBus();
	// all changes occurred in children, will be translated to content change event
	useEffect(() => {
		const onComputeChanged = (param: ComputedObjectiveParameter) => {
			if (param !== parameter) {
				// my children, proxy to my content change event and fire
				fire(ParameterEventTypes.COMPUTE_CONTENT_CHANGED, parameter);
			}
		};
		on(ParameterEventTypes.COMPUTE_CONTENT_CHANGED, onComputeChanged);
		return () => {
			off(ParameterEventTypes.COMPUTE_CONTENT_CHANGED, onComputeChanged);
		};
	}, [on, off, fire, parameter]);

	return () => fire(ParameterEventTypes.COMPUTE_CONTENT_CHANGED, parameter);
};

export const useSubParameterChanged = (parameter: ComputedObjectiveParameter) => {
	const {on, off, fire} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, forceUpdate);
		on(ParameterEventTypes.COMPUTE_PARAMETER_ADDED, forceUpdate);
		on(ParameterEventTypes.COMPUTE_PARAMETER_REMOVED, forceUpdate);
		return () => {
			off(ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, forceUpdate);
			off(ParameterEventTypes.COMPUTE_PARAMETER_ADDED, forceUpdate);
			off(ParameterEventTypes.COMPUTE_PARAMETER_REMOVED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	return {
		onDeleted: (sub: ObjectiveParameter) => {
			return () => {
				fire(ParameterEventTypes.COMPUTE_PARAMETER_REMOVED, parameter, sub);
			};
		},
		onAdded: () => {
			return (sub: ObjectiveParameter) => {
				fire(ParameterEventTypes.COMPUTE_PARAMETER_ADDED, parameter, sub);
			};
		}
	};
};
