import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator,
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
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parent: ComputedObjectiveParameter; parameter: ObjectiveParameter; onDeleted: () => void;
}) => {
	const {objective, factor, indicator, parent, parameter, onDeleted} = props;

	const onDeleteClicked = useSubParamDelete(parent, parameter, onDeleted, Lang.INDICATOR.OBJECTIVE.CANNOT_DELETE_COMPUTATION_PARAMETER);

	return <>
		<ConstantEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<FactorEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<RemoveMeButton onClick={onDeleteClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveMeButton>
		<ComputedEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
	</>;

};
