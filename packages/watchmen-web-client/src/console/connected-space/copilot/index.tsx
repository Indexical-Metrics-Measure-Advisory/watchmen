import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {CLIWrapper} from '@/widgets/chatbot';
import React from 'react';
import {CONNECTED_SPACE_COMMANDS, CONNECTED_SPACE_HELP_COMMAND} from './commands';
import {CopilotEventBusProvider} from './copilot-event-bus';
import {Execution} from './execution';
import {CopilotHeader} from './header';

export const Copilot = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	return <CopilotEventBusProvider>
		<CopilotHeader connectedSpace={connectedSpace}/>
		<CLIWrapper greeting="This channel is for working on connected space."
		            commands={CONNECTED_SPACE_COMMANDS}
		            helpCommand={CONNECTED_SPACE_HELP_COMMAND}
		            execution={Execution}/>
	</CopilotEventBusProvider>;
};
