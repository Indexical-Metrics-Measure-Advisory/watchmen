import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {TargetTitle} from './target-title';
import {ValuedTarget} from './valued-target';
import {TargetCard, TargetValueLabel, TargetValueRow} from './widgets';

export const Target = (props: {
	derivedObjective: DerivedObjective; target: ObjectiveTarget; index: number; values?: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, index, values} = props;

	if (values == null) {
		return <TargetCard data-hide-on-share={true}>
			<TargetTitle target={target} index={index} breakdown={false}/>
		</TargetCard>;
	}

	if (values.failed) {
		return <TargetCard data-hide-on-share={true}>
			<TargetTitle target={target} index={index} breakdown={false}/>
			<TargetValueRow>
				<TargetValueLabel data-failed={true}>{Lang.INDICATOR.OBJECTIVE.TEST_VALUE_GET_NONE}</TargetValueLabel>
			</TargetValueRow>
		</TargetCard>;
	}

	return <ValuedTarget derivedObjective={derivedObjective} target={target} index={index} values={values}/>;
};