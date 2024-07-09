import {CONSANGUINITY_HELP_COMMAND} from '@/data-quality/consanguinity/commands';
import {CliEventTypes, HelpCommandDescription, HelpCommandName, useCliEventBus} from '@/widgets/chatbot';
import React from 'react';
import {GraphHelpCmd} from './help';

export const GraphBrief = () => {
	const {fire} = useCliEventBus();

	const onGraphHelpClicked = () => {
		fire(CliEventTypes.EXECUTE_COMMAND, [CONSANGUINITY_HELP_COMMAND, GraphHelpCmd]);
	};

	return <>
		<HelpCommandName onClick={onGraphHelpClicked}>-- graph</HelpCommandName>
		<HelpCommandDescription>Show graph command help.</HelpCommandDescription>
	</>;
};