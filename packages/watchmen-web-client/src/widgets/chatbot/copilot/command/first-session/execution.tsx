import {CopilotAnswerWithSession} from '@/services/copilot/types';
import {isBlank} from '@/services/utils';
import React, {useEffect, useState} from 'react';
import {v4} from 'uuid';
// noinspection ES6PreferShortImport
import {useEventBus} from '../../../../events/event-bus';
// noinspection ES6PreferShortImport
import {EventTypes} from '../../../../events/types';
// noinspection ES6PreferShortImport
import {ExecutionCommandLineText, ExecutionContent, ExecutionDelegate, ExecutionResultItemText} from '../../../cli';
// noinspection ES6PreferShortImport
import {useCopilotEventBus} from '../../copilot-event-bus';
// noinspection ES6PreferShortImport
import {CopilotEventTypes} from '../../copilot-event-bus-types';
// noinspection ES6PreferShortImport
import {Answer, ConnectFailed} from '../common';
import {CMD_FIRST_SESSION, FirstSessionCommand} from './command';

export const isFirstSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_FIRST_SESSION;
};

export interface FirstSessionExecutionProps {
	content: ExecutionContent;
}

export const FirstSessionExecution = (props: FirstSessionExecutionProps) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as FirstSessionCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		const sessionId = v4();
		// first
		const greeting = <ExecutionResultItemText>{command.greeting}</ExecutionResultItemText>;
		setResult({content: greeting, toBeContinue: true});
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await command.action(sessionId),
			(answer: CopilotAnswerWithSession) => {
				const {sessionId: newSessionId} = answer;
				// use the generated session id instead when session id is not given by replied data
				fireCopilot(CopilotEventTypes.NEW_SESSION, newSessionId || sessionId);
				setResult({
					content: <Answer greeting={greeting} answer={answer}/>, toBeContinue: false
				});
			}, () => {
				const askRetryCommand = async () => ({commands: [command]});
				setResult({
					content: <ConnectFailed greeting={greeting} askRetryCommand={askRetryCommand}/>,
					toBeContinue: false
				});
			}, true);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = isBlank(command.replyTo)
		? null
		: <ExecutionCommandLineText>{command.replyTo}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};