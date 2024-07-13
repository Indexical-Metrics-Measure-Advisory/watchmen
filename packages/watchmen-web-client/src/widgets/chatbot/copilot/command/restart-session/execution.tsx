import {CopilotAnswer, CopilotAnswerItemType, CopilotAnswerOption} from '@/services/copilot/types';
import React, {Fragment, useEffect, useState} from 'react';
import {v4} from 'uuid';
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
import {CopilotConstants} from '../../constants';
// noinspection ES6PreferShortImport
import {useCopilotEventBus} from '../../copilot-event-bus';
// noinspection ES6PreferShortImport
import {CopilotEventTypes} from '../../copilot-event-bus-types';
// noinspection ES6PreferShortImport
import {Answer} from '../common';
import {createYesCommand, NoCmd} from '../noted';
import {
	CMD_DO_RESTART_SESSION,
	CMD_RESTART_SESSION,
	createDoRestartSessionCommand,
	DoRestartSessionCommand,
	RestartSessionCommand
} from './command';

export const isRestartSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_RESTART_SESSION;
};

export interface RestartSessionExecutionProps {
	content: ExecutionContent;
}

export const RestartSessionExecution = (props: RestartSessionExecutionProps) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as RestartSessionCommand;

	const {fire: fireCopilot} = useCopilotEventBus();
	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		const sessionId = v4();
		// start a new session
		setResult({content: <Fragment/>, toBeContinue: false});
		fire(CliEventTypes.EXECUTE_COMMAND, [createDoRestartSessionCommand({
			greeting: command.greeting, askRestartCommand: command.askRestartCommand
		})]);
		// create this new session anyway
		fireCopilot(CopilotEventTypes.NEW_SESSION, sessionId);
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cli = <ExecutionCommandLinePrimary>
		{Lang.COPILOT.ASK_RESTART_SESSION}
	</ExecutionCommandLinePrimary>;

	return <ExecutionDelegate content={content} commandLine={cli} result={result.content}
	                          toBeContinue={result.toBeContinue}/>;
};

export const isDoRestartSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_DO_RESTART_SESSION;
};

export interface DoRestartSessionExecutionProps {
	content: ExecutionContent;
}

export const DoRestartSessionExecution = (props: DoRestartSessionExecutionProps) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as DoRestartSessionCommand;

	const {fire} = useCliEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		const handleOption = async (option: CopilotAnswerOption) => {
			if (command.askRestartCommand == null) {
				return true;
			}
			const {token} = option;
			if (token === CopilotConstants.Yes) {
				fire(CliEventTypes.EXECUTE_COMMAND, [createYesCommand(command.askRestartCommand)]);
			} else {
				fire(CliEventTypes.EXECUTE_COMMAND, [NoCmd]);
			}
			return true;
		};
		const answer: CopilotAnswer = {
			data: command.askRestartCommand == null
				? []
				: [
					{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.YES, token: CopilotConstants.Yes},
					'',
					{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.NO, token: CopilotConstants.No}
				]
		};
		// setResult({content: greeting, toBeContinue: true});
		setResult({
			content: <Answer greeting={<ExecutionResultItemText>{command.greeting}</ExecutionResultItemText>}
			                 answer={answer}
			                 handleOption={handleOption}/>,
			toBeContinue: false
		});
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <ExecutionDelegate content={content} result={result.content} toBeContinue={result.toBeContinue}/>;
};
