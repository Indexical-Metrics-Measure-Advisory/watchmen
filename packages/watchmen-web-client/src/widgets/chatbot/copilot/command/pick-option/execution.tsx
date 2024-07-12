import React, {useEffect, useState} from 'react';
import {ExecutionCommandLineText, ExecutionContent, ExecutionDelegate, useCliEventBus} from '../../../cli';
import {CMD_PICK_OPTION, PickOptionCommand} from './command';

export const isPickOptionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_PICK_OPTION;
};

export const PickOptionExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as PickOptionCommand;

	const {fire} = useCliEventBus();
	const [result] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		// TODO HANDLE PICKED OPTION
		// const greeting =
		// 	<ExecutionResultItemText>{Lang.COPILOT.NOTED}</ExecutionResultItemText>;
		// setResult({content: greeting, toBeContinue: false});
		// fire(CliEventTypes.COMMAND_EXECUTED);
	}, [fire]);

	const cli = <ExecutionCommandLineText>{command.text}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};