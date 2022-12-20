import {ObjectiveParameter, ObjectiveParameterType} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useParamFrom} from './use-param-from';
import {ParameterFromEditContainer, ParameterFromIcon, ParameterTypeButton} from './widgets';

const OptionsLabel: Record<ObjectiveParameterType, string> = {
	[ObjectiveParameterType.REFER]: 'Refer',
	[ObjectiveParameterType.CONSTANT]: 'Constant',
	[ObjectiveParameterType.COMPUTED]: 'Compute'
};

export const ParameterFromEditor = (props: { parameter: ObjectiveParameter }) => {
	const {parameter} = props;

	const {onFromChanged, onIconClicked, onStartEditing, onBlur, editing} = useParamFrom(parameter);

	const candidates = [
		ObjectiveParameterType.REFER, ObjectiveParameterType.CONSTANT, ObjectiveParameterType.COMPUTED
	].filter(candidate => candidate !== parameter.kind);

	return <ParameterFromEditContainer onClick={onStartEditing} tabIndex={0} onBlur={onBlur}>
		<ParameterTypeButton active={true} edit={editing}
		                     onClick={onFromChanged(parameter.kind)}>
			{OptionsLabel[parameter.kind]}
		</ParameterTypeButton>
		{candidates.map(candidate => {
			return <ParameterTypeButton active={false} edit={editing}
			                            onClick={onFromChanged(candidate)}
			                            key={candidate}>
				{OptionsLabel[candidate]}
			</ParameterTypeButton>;
		})}
		<ParameterFromIcon onClick={onIconClicked} data-expanded={editing}>
			{editing ? <FontAwesomeIcon icon={ICON_COLLAPSE_CONTENT}/> : <FontAwesomeIcon icon={ICON_EDIT}/>}
		</ParameterFromIcon>
	</ParameterFromEditContainer>;
};
