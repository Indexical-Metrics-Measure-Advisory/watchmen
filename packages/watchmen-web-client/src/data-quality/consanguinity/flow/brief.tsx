import {CliEventTypes, HelpCommandDescription, HelpCommandName, useCliEventBus} from '@/widgets/chatbot';
import React from 'react';
import {CONSANGUINITY_HELP_COMMAND} from '../commands';
import {FlowHelpCmd} from './help';

export const FlowBrief = () => {
	const {fire} = useCliEventBus();

	const onFlowHelpClicked = () => {
		fire(CliEventTypes.EXECUTE_COMMAND, [CONSANGUINITY_HELP_COMMAND, FlowHelpCmd]);
	};

	return <>
		<HelpCommandName onClick={onFlowHelpClicked}>-- flow</HelpCommandName>
		<HelpCommandDescription>Show flow command help.</HelpCommandDescription>
	</>;
};