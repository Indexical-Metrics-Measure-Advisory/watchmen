import {AiModel} from '@/services/data/tuples/ai-model-types';
import {TuplePropertyInput} from '@/widgets/tuple-workbench/tuple-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent} from 'react';

export const AiModelInput = (props: { model: AiModel, propName: keyof AiModel, placeholder?: string }) => {
	const {model, propName, placeholder} = props;
	const forceUpdate = useForceUpdate();

	const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		(model as any)[propName] = value;
		forceUpdate();
	};

	return <TuplePropertyInput value={model[propName] as string} onChange={onValueChange} placeholder={placeholder}/>;
};
