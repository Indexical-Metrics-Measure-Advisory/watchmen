import {CONSANGUINITY_HELP_COMMAND} from '@/data-quality/consanguinity/commands';
import {CliEventTypes, HelpCommandDescription, HelpCommandName, useCliEventBus} from '@/widgets/chatbot';
import React from 'react';
import {TopicHelpCmd} from './help';

export const TopicBrief = () => {
	const {fire} = useCliEventBus();

	const onTopicHelpClicked = () => {
		fire(CliEventTypes.EXECUTE_COMMAND, [CONSANGUINITY_HELP_COMMAND, TopicHelpCmd]);
	};

	return <>
		<HelpCommandName onClick={onTopicHelpClicked}>-- topic</HelpCommandName>
		<HelpCommandDescription>Show topic command help.</HelpCommandDescription>
	</>;
};