import {createFirstNewSessionCommand} from '@/console/connected-space/copilot/command';
import {CopilotEventTypes} from '@/console/connected-space/copilot/copilot-event-bus-types';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {CliEventTypes, CLIWrapper, useCliEventBus} from '@/widgets/chatbot';
import React, {Fragment, useEffect, useState} from 'react';
import {CONNECTED_SPACE_COMMANDS, CONNECTED_SPACE_HELP_COMMAND} from './commands';
import {CopilotEventBusProvider, useCopilotEventBus} from './copilot-event-bus';
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
		const onCurrentSession = (onReply: (sessionId?: string) => void) => {
			if (sessions.length === 0) {
				onReply();
			} else {
				onReply(sessions[sessions.length - 1].id);
			}
		};
		on(CopilotEventTypes.NEW_SESSION, onNewSession);
		on(CopilotEventTypes.CURRENT_SESSION, onCurrentSession);
		return () => {
			off(CopilotEventTypes.NEW_SESSION, onNewSession);
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
