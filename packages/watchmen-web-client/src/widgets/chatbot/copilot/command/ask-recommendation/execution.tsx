import {CopilotAnswerWithSession} from '@/services/copilot/types';
import {isBlank, isNotBlank} from '@/services/utils';
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
	ExecutionResultItemText,
	useCliEventBus
} from '../../../cli';
// noinspection ES6PreferShortImport
import {useCopilotEventBus} from '../../copilot-event-bus';
// noinspection ES6PreferShortImport
import {CopilotEventTypes} from '../../copilot-event-bus-types';
import {Answer, ConnectFailed} from '../common';
import {
	AskRecommendationCommand,
	CMD_ASK_RECOMMENDATION,
	CMD_DO_ASK_RECOMMENDATION,
	createDoAskRecommendationCommand,
	DoAskRecommendationCommand
} from './command';

export const isAskRecommendationContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_ASK_RECOMMENDATION;
};

export interface AskRecommendationExecutionProps {
	content: ExecutionContent;
}

export const AskRecommendationExecution = (props: AskRecommendationExecutionProps) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as AskRecommendationCommand;


	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		// start a new session
		setResult({content: <Fragment/>, toBeContinue: false});
		fire(CliEventTypes.EXECUTE_COMMAND, [createDoAskRecommendationCommand({
			greeting: command.greeting, action: command.action
		})]);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = <ExecutionCommandLinePrimary>
		{Lang.COPILOT.ASK_RECOMMENDATION}
	</ExecutionCommandLinePrimary>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};

export const isDoAskRecommendationContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_DO_ASK_RECOMMENDATION;
};

export const DoAskRecommendationExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as DoAskRecommendationCommand;

	// console.log(content)

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionId = currentSessionId ?? v4();
			const greeting = <ExecutionResultItemText>
				{command.greeting ?? Lang.COPILOT.REPLY_ASKING_RECOMMENDATION}
			</ExecutionResultItemText>;
			setResult({content: greeting, toBeContinue: true});
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await command.action(sessionId),
				(answer: CopilotAnswerWithSession) => {
					const {sessionId: newSessionId} = answer;
					if (sessionId !== newSessionId && isNotBlank(newSessionId)) {
						// use the generated session id instead when session id is not given by replied data
						fireCopilot(CopilotEventTypes.REPLACE_SESSION, newSessionId!);
					} else {
						fireCopilot(CopilotEventTypes.REPLACE_SESSION, sessionId);
					}
					setResult({
						content: <Answer greeting={greeting} answer={answer}/>,
						toBeContinue: false
					});
				}, () => {
					const askRetryCommand = async () => ({commands: [command]});
					setResult({
						content: <ConnectFailed greeting={greeting} askRetryCommand={askRetryCommand}/>,
						toBeContinue: false
					});
				}, true);
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
