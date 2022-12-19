import {ComputedObjectiveParameter, Objective, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {ICON_DELETE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {ComputedEditor} from '../compute';
import {ConstantEditor} from '../constant';
import {FactorEditor} from '../factor';
import {useSubParamDelete} from './use-sub-param-delete';
import {RemoveMeButton} from './widgets';

export const SubParameterEditBody = (props: {
	objective: Objective;
	parent: ComputedObjectiveParameter;
	parameter: ObjectiveParameter;
	onDeleted: () => void;
}) => {
	const {objective, parent, parameter, onDeleted} = props;

	const onDeleteClicked = useSubParamDelete(parent, parameter, onDeleted,
		'Cannot delete this because of reach minimum parameter(s).');

	return <>
		<ConstantEditor objective={objective} parameter={parameter}/>
		<FactorEditor objective={objective} parameter={parameter}/>
		<RemoveMeButton onClick={onDeleteClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveMeButton>
		<ComputedEditor objective={objective} parameter={parameter}/>
	</>;

};
