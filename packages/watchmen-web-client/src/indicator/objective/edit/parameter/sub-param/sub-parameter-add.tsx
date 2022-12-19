import {ComputedObjectiveParameter, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {ICON_ADD} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {canAddMoreParameter} from '../utils';
import {useSubParamAdd} from './use-sub-param-add';
import {ParameterAddButton, ParameterAddContainer} from './widgets';

export const SubParameterAdd = (props: {
	parent: ComputedObjectiveParameter;
	onAdded: (parameter: ObjectiveParameter) => void;
}) => {
	const {parent, onAdded} = props;

	const onAddClicked = useSubParamAdd(parent, onAdded, 'Cannot add more because of reach maximum parameter(s).');

	const canAdd = canAddMoreParameter(parent);
	if (!canAdd) {
		return null;
	}

	return <ParameterAddContainer>
		<ParameterAddButton onClick={onAddClicked}>
			<FontAwesomeIcon icon={ICON_ADD}/>
			<span>Add Parameter</span>
		</ParameterAddButton>
	</ParameterAddContainer>;
};