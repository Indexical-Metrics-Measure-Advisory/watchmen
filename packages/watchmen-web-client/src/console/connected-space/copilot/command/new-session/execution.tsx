import {startConnectedSpaceCopilotSession} from '@/services/copilot/connected-space';
import {
	ConnectedSpaceCopilotSession,
	CopilotAnswer,
	CopilotAnswerItemType,
	CopilotAnswerOption
} from '@/services/copilot/types';
import {isBlank, isNotBlank} from '@/services/utils';
import {
	CliEventTypes,
	CopilotConstants,
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
import {createAskRecommendationCommand} from '../ask-recommendation';
import {Answer, ConnectFailed} from '../common';
import {NotedCmd} from '../noted';
import {CMD_NEW_SESSION, NewSessionCommand} from './command';

export const isNewSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_NEW_SESSION;
};

const RestartSession = () => {
	const {fire} = useCliEventBus();
	const handleOption = async (option: CopilotAnswerOption) => {
		const {token} = option;
		if (token === CopilotConstants.Yes) {
			fire(CliEventTypes.EXECUTE_COMMAND, [createAskRecommendationCommand()]);
		} else {
			fire(CliEventTypes.EXECUTE_COMMAND, [NotedCmd]);
		}
		return true;
	};
	const answer: CopilotAnswer = {
		data: [
			{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.YES, token: CopilotConstants.Yes},
			'',
			{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.NO, token: CopilotConstants.No}
		]
	};
	return <Answer greeting={Lang.COPILOT.CONNECTED_SPACE.GREETING_RESTART_SESSION}
	               answer={answer}
	               handleOption={handleOption}/>;
};

export const NewSessionExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as NewSessionCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionExists = isNotBlank(currentSessionId);
			const sessionId = v4();
			if (sessionExists) {
				// start a new session
				setResult({content: <RestartSession/>, toBeContinue: false});
				// create this new session anyway
				fireCopilot(CopilotEventTypes.NEW_SESSION, sessionId);
			} else {
				// first
				const greeting = <ExecutionResultItemText>
					{Lang.COPILOT.CONNECTED_SPACE.GREETING_FIRST_SESSION}
				</ExecutionResultItemText>;
				setResult({content: greeting, toBeContinue: true});
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await startConnectedSpaceCopilotSession(sessionId, true),
					(answer: ConnectedSpaceCopilotSession) => {
						const {sessionId: newSessionId} = answer;
						// use the generated session id instead when session id is not given by replied data
						fireCopilot(CopilotEventTypes.NEW_SESSION, newSessionId || sessionId);
						setResult({
							content: <Answer greeting={greeting} answer={answer}/>, toBeContinue: false
						});
					}, () => {
						const retry = async () => {
							// TODO RETRY CREATE SESSION
						};
						setResult({
							content: <ConnectFailed greeting={greeting} retry={retry}/>, toBeContinue: false
						});
					}, true);
			}
		});
	}, [fireGlobal, fireCopilot, fire]);

	const cli = isBlank(command.replyTo)
		? null
		: <ExecutionCommandLineText>{command.replyTo}</ExecutionCommandLineText>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};