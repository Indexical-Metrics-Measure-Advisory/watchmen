import {startConnectedSpaceCopilotSession} from '@/services/copilot/connected-space';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {CopilotWrapper, createFirstSessionCommand} from '@/widgets/chatbot';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {CONNECTED_SPACE_COMMANDS} from './commands';
import {CopilotHeader} from './header';

export const Copilot = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	const askFirstCommand = () => {
		return {
			commands: [
				createFirstSessionCommand({
					greeting: Lang.COPILOT.CONNECTED_SPACE.GREETING_FIRST_SESSION,
					action: async (sessionId: string) => startConnectedSpaceCopilotSession(sessionId, true)
				})
			]
		};
	};
	return <CopilotWrapper
		header={<CopilotHeader connectedSpace={connectedSpace}/>}
		greeting="This channel is for working on connected space."
		executionGrabSpace={true}
		commands={CONNECTED_SPACE_COMMANDS}
		askFirstCommand={askFirstCommand}/>;
};
