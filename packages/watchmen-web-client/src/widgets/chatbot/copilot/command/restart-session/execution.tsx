import {CopilotAnswer, CopilotAnswerItemType, CopilotAnswerOption} from '@/services/copilot/types';
import React, {useEffect, useState} from 'react';
import {v4} from 'uuid';
// noinspection ES6PreferShortImport
import {Lang} from '../../../../langs';
import {
	CliEventTypes, ExecutionCommandLinePrimary,
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
import {Answer} from '../common';
import {NotedCmd} from '../noted';
import {RetryCommand} from '../types';
import {CMD_RESTART_SESSION, RestartSessionCommand} from './command';

export const isRestartSessionContent = (content: ExecutionContent): boolean => {
	return content.commands[0].command === CMD_RESTART_SESSION;
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

	return <Answer greeting={<ExecutionResultItemText>{greeting}</ExecutionResultItemText>} answer={answer}
	               handleOption={handleOption}/>;
};

export interface RestartSessionExecutionProps {
	content: ExecutionContent;
}

export const RestartSessionExecution = (props: RestartSessionExecutionProps) => {
	const {content} = props;
	const {commands} = content;
	const command = commands[0] as RestartSessionCommand;

	const {fire: fireCopilot} = useCopilotEventBus();
	const [result, setResult] = useState<{ content?: any, toBeContinue: boolean }>({toBeContinue: true});
	useEffect(() => {
		const sessionId = v4();
		// start a new session
		setResult({
			content: <RestartSession greeting={command.greeting}
			                         askRestartCommand={command.askRestartCommand}/>,
			toBeContinue: false
		});
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