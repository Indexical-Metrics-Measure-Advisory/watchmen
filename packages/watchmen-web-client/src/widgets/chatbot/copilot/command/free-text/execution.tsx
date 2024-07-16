import {freeChat} from '@/services/copilot/free-chat';
import {OngoingCopilotAnswer} from '@/services/copilot/types';
import {isNotBlank} from '@/services/utils';
import React, {Fragment, useEffect, useState} from 'react';
import {v4} from 'uuid';
// noinspection ES6PreferShortImport
import {useEventBus} from '../../../../events/event-bus';
// noinspection ES6PreferShortImport
import {EventTypes} from '../../../../events/types';
// noinspection ES6PreferShortImport
import {Lang} from '../../../../langs';
import {
	CliEventTypes,
	ExecutionCommandLinePrimary,
	ExecutionCommandLineText,
	ExecutionContent,
	ExecutionDelegate,
	useCliEventBus
} from '../../../cli';
// noinspection ES6PreferShortImport
import {useCopilotEventBus} from '../../copilot-event-bus';
// noinspection ES6PreferShortImport
import {CopilotEventTypes} from '../../copilot-event-bus-types';
import {Answer, ConnectFailed} from '../common';
import {CMD_DO_FREE_TEXT, CMD_FREE_TEXT, createDoFreeTextCommand, DoFreeTextCommand} from './command';

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
		fire(CliEventTypes.EXECUTE_COMMAND, [createDoFreeTextCommand({
			replyTo: text,
			action: async (sessionId: string) => await freeChat(sessionId, text)
		})]);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = <ExecutionCommandLinePrimary>{text}</ExecutionCommandLinePrimary>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};

export const isDoFreeTextContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_DO_FREE_TEXT;
};

export const DoFreeTextExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as DoFreeTextCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionId = currentSessionId ?? v4();
			setResult({content: <Fragment/>, toBeContinue: true});
			const chat = (token?: string) => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await command.action(sessionId, token),
					(answer: OngoingCopilotAnswer) => {
						const {sessionId: newSessionId} = answer;
						if (sessionId !== newSessionId && isNotBlank(newSessionId)) {
							// use the generated session id instead when session id is not given by replied data
							fireCopilot(CopilotEventTypes.REPLACE_SESSION, newSessionId!);
						} else {
							fireCopilot(CopilotEventTypes.REPLACE_SESSION, sessionId);
						}
						if (isNotBlank(answer.token)) {
							setResult({
								content: <ExecutionCommandLineText>{Lang.COPILOT.STILL_WORKING}</ExecutionCommandLineText>,
								toBeContinue: true
							});
						} else {
							setResult({
								content: <Answer greeting={<Fragment/>} answer={answer}/>,
								toBeContinue: false
							});
						}
					}, () => {
						const askRetryCommand = async () => ({commands: [command]});
						setResult({
							content: <ConnectFailed greeting={<Fragment/>} askRetryCommand={askRetryCommand}/>,
							toBeContinue: false
						});
					}, true);
			};
			chat();
		});
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <ExecutionDelegate content={content} result={result.content} toBeContinue={result.toBeContinue}/>;
};
