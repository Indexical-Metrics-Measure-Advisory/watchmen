import {ExternalWriter} from '@/services/data/tuples/external-writer-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput} from '@/widgets/tuple-workbench/tuple-editor';
import React, {ChangeEvent} from 'react';
import {useExternalWriterEventBus} from '../external-writer-event-bus';
import {ExternalWriterEventTypes} from '../external-writer-event-bus-types';

export const ExternalWriterNameInput = (props: { writer: ExternalWriter }) => {
	const {writer} = props;

	const {fire} = useExternalWriterEventBus();
	const forceUpdate = useForceUpdate();
	const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (writer.name !== event.target.value) {
			writer.name = event.target.value;
			fire(ExternalWriterEventTypes.EXTERNAL_WRITER_NAME_CHANGED, writer);
			forceUpdate();
		}
	};

	return <TuplePropertyInput value={writer.name || ''} onChange={onNameChange}/>;
};