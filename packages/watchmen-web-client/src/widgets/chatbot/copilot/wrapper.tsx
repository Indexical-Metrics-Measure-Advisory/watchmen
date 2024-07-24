import React, {FC, Fragment, ReactNode, useEffect, useState} from 'react';
import {CliEventTypes, CLIWrapper, useCliEventBus} from '../cli';
import {Command} from '../command';
// noinspection ES6PreferShortImport
import {CopilotEventBusProvider, useCopilotEventBus} from './copilot-event-bus';
// noinspection ES6PreferShortImport
import {CopilotEventTypes} from './copilot-event-bus-types';
import {CopilotExecutionProps, createCopilotExecution} from './execution';

export const CopilotInitialCommand = (props: {
	askFirstCommand: () => { commands: Array<Command>, argument?: string }
}) => {
	const {askFirstCommand} = props;

	const {fire} = useCliEventBus();
	useEffect(() => {
		const {commands, argument} = askFirstCommand();

		fire(CliEventTypes.EXECUTE_COMMAND, commands, argument);
		// only once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <Fragment/>;
};

export enum CopilotSessionStatus {
	PROCESSING, CLOSED
}

export interface CopilotSession {
	id: string;
	status: CopilotSessionStatus;
}

export const CopilotSessionHolder = () => {
	const [sessions] = useState<Array<CopilotSession>>([]);
	const {on, off} = useCopilotEventBus();
	useEffect(() => {
		const onNewSession = (newSessionId: string) => {
			if (sessions.length !== 0) {
				sessions[sessions.length - 1].status = CopilotSessionStatus.CLOSED;
			}
			sessions.push({id: newSessionId, status: CopilotSessionStatus.PROCESSING});
		};
		const onReplaceSession = (newSessionId: string) => {
			if (sessions.length === 0) {
				sessions.push({id: newSessionId, status: CopilotSessionStatus.PROCESSING});
			} else {
				const latestSession = sessions[sessions.length - 1];
				if (latestSession.status === CopilotSessionStatus.CLOSED) {
					onNewSession(newSessionId);
				} else {
					latestSession.id = newSessionId;
				}
			}
		};
		const onCurrentSession = (onReply: (sessionId?: string) => void) => {
			if (sessions.length === 0 || sessions[sessions.length - 1].status === CopilotSessionStatus.CLOSED) {
				onReply();
			} else {
				onReply(sessions[sessions.length - 1].id);
			}
		};
		on(CopilotEventTypes.NEW_SESSION, onNewSession);
		on(CopilotEventTypes.REPLACE_SESSION, onReplaceSession);
		on(CopilotEventTypes.CURRENT_SESSION, onCurrentSession);
		return () => {
			off(CopilotEventTypes.NEW_SESSION, onNewSession);
			off(CopilotEventTypes.REPLACE_SESSION, onReplaceSession);
			off(CopilotEventTypes.CURRENT_SESSION, onCurrentSession);
		};
	}, [on, off, sessions]);

	return <Fragment/>;
};

export interface CopilotWrapperProps {
	header?: ReactNode;
	greeting: string;
	commands: Array<Command>;
	helpCommand?: Command;
	executionGrabSpace?: boolean;
	executionRenderer?: FC<CopilotExecutionProps>;
	askFirstCommand: () => { commands: Array<Command>, argument?: string };
}

export const CopilotWrapper = (props: CopilotWrapperProps) => {
	const {
		header, greeting, commands, helpCommand,
		executionGrabSpace = false, executionRenderer, askFirstCommand
	} = props;

	return <CopilotEventBusProvider>
		{header}
		<CopilotSessionHolder/>
		<CLIWrapper greeting={greeting} commands={commands} helpCommand={helpCommand}
		            executionGrabSpace={executionGrabSpace} execution={createCopilotExecution(executionRenderer)}>
			<CopilotInitialCommand askFirstCommand={askFirstCommand}/>
		</CLIWrapper>
	</CopilotEventBusProvider>;
};
