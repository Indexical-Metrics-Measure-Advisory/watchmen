import {ReferObjectiveParameter} from '@/services/data/tuples/objective-types';
import {SubjectDataSetColumnId} from '@/services/data/tuples/subject-types';
import {TopicId} from '@/services/data/tuples/topic-types';
import {isBlank} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';

export const useFactor = (parameter: ReferObjectiveParameter) => {
	const {fire} = useParameterEventBus();
	const forceUpdate = useForceUpdate();

	const {uuid} = parameter;

	const onFactorChange = (option: DropdownOption) => {
		if (isBlank(option.value)) {
			parameter.uuid = '';
		} else {
			parameter.uuid = option.value as (TopicId | SubjectDataSetColumnId);
		}
		forceUpdate();
		fire(ParameterEventTypes.FACTOR_CHANGED, parameter);
	};

	return {onFactorChange, uuid};
};