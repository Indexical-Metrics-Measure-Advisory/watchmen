import {ObjectiveParameter, ObjectiveParameterType} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useParamFrom} from './use-param-from';
import {ParameterFromEditContainer, ParameterFromIcon, ParameterTypeButton} from './widgets';

export const ParameterFromEditor = (props: {
	parameter: ObjectiveParameter,
	fix?: boolean; label?: string;
}) => {
	const {parameter, fix = false, label} = props;

	const {onFromChanged, onIconClicked, onStartEditing, onBlur, editing} = useParamFrom(parameter);

	const candidates = fix ? [] : [
		ObjectiveParameterType.REFER, ObjectiveParameterType.CONSTANT, ObjectiveParameterType.COMPUTED
	].filter(candidate => candidate !== parameter.kind);
	const OptionsLabel: Record<ObjectiveParameterType, string> = {
		[ObjectiveParameterType.REFER]: Lang.PARAM.FROM_INDICATOR,
		[ObjectiveParameterType.CONSTANT]: Lang.PARAM.FROM_CONSTANT,
		[ObjectiveParameterType.COMPUTED]: Lang.PARAM.FROM_COMPUTED,
		[ObjectiveParameterType.BUCKET]: Lang.PARAM.FROM_BUCKET
	};

	return <ParameterFromEditContainer onClick={onStartEditing} tabIndex={0} onBlur={onBlur}>
		<ParameterTypeButton active={true} edit={editing}
		                     onClick={onFromChanged(parameter.kind)}>
			{fix ? (label ?? OptionsLabel[parameter.kind]) : OptionsLabel[parameter.kind]}
		</ParameterTypeButton>
		{candidates.map(candidate => {
			return <ParameterTypeButton active={false} edit={editing}
			                            onClick={onFromChanged(candidate)}
			                            key={candidate}>
				{OptionsLabel[candidate]}
			</ParameterTypeButton>;
		})}
		{fix ? null
			: <ParameterFromIcon onClick={onIconClicked} data-expanded={editing}>
				{editing ? <FontAwesomeIcon icon={ICON_COLLAPSE_CONTENT}/> : <FontAwesomeIcon icon={ICON_EDIT}/>}
			</ParameterFromIcon>}
	</ParameterFromEditContainer>;
};
