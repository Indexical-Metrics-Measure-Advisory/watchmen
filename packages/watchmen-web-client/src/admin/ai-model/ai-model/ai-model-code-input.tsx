import { AiModel } from '@/services/data/tuples/ai-model-types';
import { TuplePropertyInput } from '@/widgets/tuple-workbench/tuple-editor';
import { useForceUpdate } from '@/widgets/basic/utils';
import { ChangeEvent } from 'react';

export const AiModelCodeInput = (props: { model: AiModel }) => {
	const {model} = props;
	const forceUpdate = useForceUpdate();

	const onValueChange = (event: ChangeEvent<HTMLInputElement>) => {
		model.modelCode = event.target.value;
		forceUpdate();
	};

	return <TuplePropertyInput value={model.modelCode} onChange={onValueChange}/>;
};
