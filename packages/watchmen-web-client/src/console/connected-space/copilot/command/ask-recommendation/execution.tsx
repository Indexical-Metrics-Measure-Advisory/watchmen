import {askRecommendation} from '@/services/copilot/ask-recommendation';
import {Recommendation, RecommendationType} from '@/services/copilot/types';
import {isBlank, isNotBlank} from '@/services/utils';
import {
	ExecutionCommandLineText,
	ExecutionContent,
	ExecutionDelegate,
	ExecutionResultItemText,
	useCliEventBus
} from '@/widgets/chatbot';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useCopilotEventBus} from '../../copilot-event-bus';
import {CopilotEventTypes} from '../../copilot-event-bus-types';
import {Answer, ConnectFailed} from '../common';
import {AskRecommendationCommand, CMD_ASK_RECOMMENDATION} from './command';

export const isAskRecommendationContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_ASK_RECOMMENDATION;
};

export const AskRecommendationExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as AskRecommendationCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionId = currentSessionId ?? v4();
			const greeting = <ExecutionResultItemText>
				{Lang.COPILOT.REPLY_ASKING_RECOMMENDATION}
			</ExecutionResultItemText>;
			setResult({content: greeting, toBeContinue: true});
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await askRecommendation(sessionId, RecommendationType.CONNECTED_SPACE),
				(answer: Recommendation) => {
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
					const retry = async () => {
						// TODO RETRY ASK RECOMMENDATION
					};
					setResult({
						content: <ConnectFailed greeting={greeting} retry={retry}/>,
						toBeContinue: false

					});
				}, true);
		});
	}, [fireGlobal, fireCopilot, fire]);

	const cli = isBlank(command.replyTo)
		? null
		: <ExecutionCommandLineText>{command.replyTo}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};
