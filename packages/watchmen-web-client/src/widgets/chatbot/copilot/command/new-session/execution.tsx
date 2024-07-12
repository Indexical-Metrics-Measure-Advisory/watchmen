import {
	CopilotAnswer,
	CopilotAnswerItemType,
	CopilotAnswerOption,
	CopilotAnswerWithSession
} from '@/services/copilot/types';
import {isBlank, isNotBlank} from '@/services/utils';
import React, {useEffect, useState} from 'react';
import {v4} from 'uuid';
// noinspection ES6PreferShortImport
import {useEventBus} from '../../../../events/event-bus';
// noinspection ES6PreferShortImport
import {EventTypes} from '../../../../events/types';
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
import {CopilotConstants} from '../../constants';
// noinspection ES6PreferShortImport
import {useCopilotEventBus} from '../../copilot-event-bus';
// noinspection ES6PreferShortImport
import {CopilotEventTypes} from '../../copilot-event-bus-types';
// noinspection ES6PreferShortImport
import {Answer, ConnectFailed} from '../common';
import {NotedCmd} from '../noted';
import {RetryCommand} from '../types';
import {CMD_NEW_SESSION, NewSessionCommand} from './command';

export const isNewSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_NEW_SESSION;
};

export interface RestartSessionProps {
	greeting: string;
	askRestartCommand?: () => Promise<RetryCommand>;
}

export const RestartSession = (props: RestartSessionProps) => {
	const {greeting, askRestartCommand} = props;

	const {fire} = useCliEventBus();
	const handleOption = async (option: CopilotAnswerOption) => {
		if (askRestartCommand == null) {
			return true;
		}
		const {token} = option;
		if (token === CopilotConstants.Yes) {
			const {commands, argument} = await askRestartCommand();
			fire(CliEventTypes.EXECUTE_COMMAND, commands, argument);
		} else {
			fire(CliEventTypes.EXECUTE_COMMAND, [NotedCmd]);
		}
		return true;
	};
	const answer: CopilotAnswer = {
		data: askRestartCommand == null
			? []
			: [
				{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.YES, token: CopilotConstants.Yes},
				'',
				{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.NO, token: CopilotConstants.No}
			]
	};
	return <Answer greeting={greeting} answer={answer} handleOption={handleOption}/>;
};

export interface NewSessionExecutionProps {
	content: ExecutionContent;
}

export const NewSessionExecution = (props: NewSessionExecutionProps) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as NewSessionCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionExists = isNotBlank(currentSessionId);
			const sessionId = v4();
			if (sessionExists) {
				// start a new session
				setResult({
					content: <RestartSession greeting={command.restartGreeting}
					                         askRestartCommand={command.askRestartCommand}/>,
					toBeContinue: false
				});
				// create this new session anyway
				fireCopilot(CopilotEventTypes.NEW_SESSION, sessionId);
			} else {
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
			}
		});
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = isBlank(command.replyTo)
		? null
		: <ExecutionCommandLineText>{command.replyTo}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};