import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactor,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {ComputedEditor} from '../compute';
import {ConstantEditor} from '../constant';
import {FactorEditor} from '../factor';
import {useSubParamDelete} from './use-sub-param-delete';
import {RemoveMeButton} from './widgets';

export const SubParameterEditBody = (props: {
	objective: Objective; parent: ComputedObjectiveParameter;
	parameter: ObjectiveParameter; onDeleted: () => void;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parent, parameter, onDeleted, factors} = props;

	const onDeleteClicked = useSubParamDelete(parent, parameter, onDeleted, Lang.INDICATOR.OBJECTIVE.CANNOT_DELETE_COMPUTATION_PARAMETER);

	return <>
		<ConstantEditor objective={objective} parameter={parameter}/>
		<FactorEditor objective={objective} parameter={parameter} factors={factors}/>
		<RemoveMeButton onClick={onDeleteClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveMeButton>
		<ComputedEditor objective={objective} parameter={parameter} factors={factors}/>
	</>;

};
