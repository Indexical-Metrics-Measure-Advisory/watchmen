import {startConnectedSpaceCopilotSession} from '@/services/copilot/connected-space';
import {ConnectedSpaceCopilotSession, CopilotAnswerType, CopilotTextWithOptionsAnswer} from '@/services/copilot/types';
import {isBlank, isNotBlank} from '@/services/utils';
import {
	CliEventTypes,
	CopilotConstants,
	ExecutionCommandLineText,
	ExecutionContent,
	ExecutionDelegate,
	ExecutionResultItemText,
	ExecutionResultOfTextWithOptions,
	useCliEventBus
} from '@/widgets/chatbot';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {Fragment, ReactNode, useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useCopilotEventBus} from '../../copilot-event-bus';
import {CopilotEventTypes} from '../../copilot-event-bus-types';
import {TextReplyCommand} from '../text-reply-command';
import {CMD_NEW_SESSION} from './command';

export const isNewSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_NEW_SESSION;
};

interface PostStartSession {
	greeting: ReactNode;
	action: () => Promise<void>;
}

const usePostStartSession = (action: () => Promise<void>) => {
	useEffect(() => {
		(async () => await action())();
	}, [action]);
};

const FailedToStartSession = (props: PostStartSession) => {
	const {greeting, action} = props;

	usePostStartSession(action);
	const onClick = async (token: string) => {
		// TODO
	};
	const answer: CopilotTextWithOptionsAnswer = {
		type: CopilotAnswerType.TEXT_WITH_OPTIONS,
		text: [
			Lang.COPILOT.CONNECT_FAIL,
			{text: Lang.COPILOT.YES, token: CopilotConstants.Yes},
			' ',
			{text: Lang.COPILOT.NO, token: CopilotConstants.No}
		]
	};
	return <>
		{greeting}
		<ExecutionResultOfTextWithOptions answer={answer} click={onClick}/>
	</>;
};

const SessionStarted = (props: PostStartSession & { answer: CopilotTextWithOptionsAnswer }) => {
	const {greeting, answer, action} = props;

	usePostStartSession(action);
	const onClick = async (token: string) => {
		// TODO
	};

	return <>
		{greeting}
		<ExecutionResultOfTextWithOptions answer={answer} click={onClick}/>
	</>;
};

const RestartSession = (props: Omit<PostStartSession, 'greeting'>) => {
	const {action} = props;

	usePostStartSession(action);
	const onClick = async (token: string) => {
		// TODO
	};
	const answer: CopilotTextWithOptionsAnswer = {
		type: CopilotAnswerType.TEXT_WITH_OPTIONS,
		text: [
			{text: Lang.COPILOT.YES, token: CopilotConstants.Yes},
			'',
			{text: Lang.COPILOT.NO, token: CopilotConstants.No}
		]
	};
	return <>
		<ExecutionResultItemText>{Lang.COPILOT.CONNECTED_SPACE.GREETING_RESTART_SESSION}</ExecutionResultItemText>
		<ExecutionResultOfTextWithOptions answer={answer} click={onClick}/>
	</>;
};

export const NewSessionExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as TextReplyCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionExists = isNotBlank(currentSessionId);
			const sessionId = v4();
			const postStartSession = async () => {
				fire(CliEventTypes.COMMAND_EXECUTED);
			};
			if (sessionExists) {
				// start a new session
				setResult({content: <RestartSession action={postStartSession}/>, toBeContinue: false});
				// create this new session anyway
				fireCopilot(CopilotEventTypes.NEW_SESSION, sessionId);
			} else {
				// first
				const greeting =
					<ExecutionResultItemText>{Lang.COPILOT.CONNECTED_SPACE.GREETING_FIRST_SESSION}</ExecutionResultItemText>;
				setResult({content: greeting, toBeContinue: true});
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await startConnectedSpaceCopilotSession(sessionId, true),
					(answer: ConnectedSpaceCopilotSession) => {
						const {sessionId: newSessionId} = answer;
						// use the generated session id instead when session id is not given by replied data
						fireCopilot(CopilotEventTypes.NEW_SESSION, newSessionId || sessionId);
						setResult({
							content: <SessionStarted greeting={greeting} answer={answer} action={postStartSession}/>,
							toBeContinue: false
						});
					}, () => {
						setResult({
							content: <FailedToStartSession greeting={greeting} action={postStartSession}/>,
							toBeContinue: false
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