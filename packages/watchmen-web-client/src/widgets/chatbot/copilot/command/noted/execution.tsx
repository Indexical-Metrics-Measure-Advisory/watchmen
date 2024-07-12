import {isBlank} from '@/services/utils';
import React, {useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {Lang} from '../../../../langs';
import {
	CliEventTypes,
	ExecutionCommandLineText,
	ExecutionContent,
	ExecutionDelegate,
	ExecutionResultItemText,
	useCliEventBus
} from '../../../cli';
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
			setResult({
				content: <ExecutionResultItemText>{command.greeting ?? Lang.COPILOT.NOTED}</ExecutionResultItemText>,
				toBeContinue: false
			});
			fire(CliEventTypes.COMMAND_EXECUTED);
			// waiting
		}, 300 + Math.random() * 200);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = isBlank(command.replyTo)
		? null
		: <ExecutionCommandLineText>{command.replyTo}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};