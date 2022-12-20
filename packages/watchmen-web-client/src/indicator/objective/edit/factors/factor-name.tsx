import {Objective, ObjectiveFactor} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';

export const FactorName = (props: { objective: Objective; factor: ObjectiveFactor }) => {
	const {objective, factor} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		factor.name = value;
		fire(ObjectivesEventTypes.FACTOR_NAME_CHANGED, objective, factor);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};

	return <Input value={factor.name || ''} onChange={onNameChanged}
	              placeholder={Lang.PLAIN.OBJECTIVE_FACTOR_NAME_PLACEHOLDER}/>;
};