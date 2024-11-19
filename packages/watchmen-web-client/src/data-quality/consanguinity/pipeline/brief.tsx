import {CONSANGUINITY_HELP_COMMAND} from '@/data-quality/consanguinity/commands';
import {CliEventTypes, HelpCommandDescription, HelpCommandName, useCliEventBus} from '@/widgets/chatbot';
import React from 'react';
import {PipelineHelpCmd} from './help';

export const PipelineBrief = () => {
	const {fire} = useCliEventBus();

	const onPipelineHelpClicked = () => {
		fire(CliEventTypes.EXECUTE_COMMAND, [CONSANGUINITY_HELP_COMMAND, PipelineHelpCmd]);
	};

	return <>
		<HelpCommandName onClick={onPipelineHelpClicked}>-- pipeline</HelpCommandName>
		<HelpCommandDescription>Show pipeline command help.</HelpCommandDescription>
	</>;
};