import {askOptionDetails} from '@/services/copilot/ask-option-details';
import {CopilotAnswerWithSession} from '@/services/copilot/types';
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
import {CMD_DO_PICK_OPTION, CMD_PICK_OPTION, createDoPickOptionCommand, PickOptionCommand} from './command';

export const isPickOptionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_PICK_OPTION;
};

export const PickOptionExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as PickOptionCommand;

	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		setResult({content: <Fragment/>, toBeContinue: false});
		fire(CliEventTypes.COMMAND_EXECUTED);
		fire(CliEventTypes.EXECUTE_COMMAND, [createDoPickOptionCommand(command.option)]);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli =
		<ExecutionCommandLinePrimary>{command.option.text}</ExecutionCommandLinePrimary>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};

export const isDoPickOptionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_DO_PICK_OPTION;
};

export const DoPickOptionExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as PickOptionCommand;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCopilot} = useCopilotEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		fireCopilot(CopilotEventTypes.CURRENT_SESSION, (currentSessionId?: string) => {
			const sessionId = currentSessionId ?? v4();
			const greeting = <ExecutionResultItemText>{Lang.COPILOT.OPTION_PICKED_NOTED}</ExecutionResultItemText>;
			setResult({content: greeting, toBeContinue: true});
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await askOptionDetails(sessionId, command.option.token,command.option.action),
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

	return <ExecutionDelegate content={content} result={result.content} toBeContinue={result.toBeContinue}/>;
};
