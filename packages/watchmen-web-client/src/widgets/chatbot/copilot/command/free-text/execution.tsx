import React, {Fragment, useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {
	CliEventTypes,
	ExecutionCommandLinePrimary,
	ExecutionContent,
	ExecutionDelegate,
	useCliEventBus
} from '../../../cli';
import {CMD_FREE_TEXT} from './command';

export const isFreeTextContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_FREE_TEXT;
};

export const FreeTextExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	// const command = commands[0] as FreeTextCommand;
	const text = commands[1].command.trim();

	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		setResult({content: <Fragment/>, toBeContinue: false});
		fire(CliEventTypes.COMMAND_EXECUTED);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = <ExecutionCommandLinePrimary>{text}</ExecutionCommandLinePrimary>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};
