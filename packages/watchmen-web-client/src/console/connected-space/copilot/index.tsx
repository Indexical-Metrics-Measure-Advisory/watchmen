import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {CliEventTypes, CLIWrapper, useCliEventBus} from '@/widgets/chatbot';
import React, {Fragment, useEffect, useState} from 'react';
import {createFirstNewSessionCommand} from './command';
import {CONNECTED_SPACE_COMMANDS, CONNECTED_SPACE_HELP_COMMAND} from './commands';
import {CopilotEventBusProvider, useCopilotEventBus} from './copilot-event-bus';
import {CopilotEventTypes} from './copilot-event-bus-types';
import {Execution} from './execution';
import {CopilotHeader} from './header';

const InitialCommand = () => {
	const {fire} = useCliEventBus();
	useEffect(() => {
		fire(CliEventTypes.EXECUTE_COMMAND, [createFirstNewSessionCommand()]);
	}, [fire]);

	return <Fragment/>;
};

enum SessionStatus {
	PROCESSING, CLOSED
}

interface Session {
	id: string;
	status: SessionStatus;
}

const SessionHolder = () => {
	const [sessions] = useState<Array<Session>>([]);
	const {on, off} = useCopilotEventBus();
	useEffect(() => {
		const onNewSession = (newSessionId: string) => {
			if (sessions.length !== 0) {
				sessions[sessions.length - 1].status = SessionStatus.CLOSED;
			}
			sessions.push({id: newSessionId, status: SessionStatus.PROCESSING});
		};
		const onReplaceSession = (newSessionId: string) => {
			if (sessions.length === 0) {
				sessions.push({id: newSessionId, status: SessionStatus.PROCESSING});
			} else {
				const latestSession = sessions[sessions.length - 1];
				if (latestSession.status === SessionStatus.CLOSED) {
					onNewSession(newSessionId);
				} else {
					latestSession.id = newSessionId;
				}
			}
		};
		const onCurrentSession = (onReply: (sessionId?: string) => void) => {
			if (sessions.length === 0 || sessions[sessions.length - 1].status === SessionStatus.CLOSED) {
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
export const Copilot = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	return <CopilotEventBusProvider>
		<SessionHolder/>
		<CopilotHeader connectedSpace={connectedSpace}/>
		<CLIWrapper greeting="This channel is for working on connected space."
		            commands={CONNECTED_SPACE_COMMANDS}
		            helpCommand={CONNECTED_SPACE_HELP_COMMAND}
		            execution={Execution}>
			<InitialCommand/>
		</CLIWrapper>
	</CopilotEventBusProvider>;
};
