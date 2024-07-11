import {isBlank} from '@/services/utils';
import {
	CliEventTypes,
	ExecutionCommandLineText,
	ExecutionContent,
	ExecutionDelegate,
	ExecutionResultItemText,
	useCliEventBus
} from '@/widgets/chatbot';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {CMD_NOTED, NotedCommand} from './command';

export const isNotedContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_NOTED;
};

export const NotedExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as NotedCommand;

	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		setTimeout(() => {
			const greeting =
				<ExecutionResultItemText>{Lang.COPILOT.NOTED}</ExecutionResultItemText>;
			setResult({content: greeting, toBeContinue: false});
			fire(CliEventTypes.COMMAND_EXECUTED);
			// waiting
		}, 300 + Math.random() * 200);
	}, [fire]);

	const cli = isBlank(command.replyTo)
		? null
		: <ExecutionCommandLineText>{command.replyTo}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};