import {CopilotWrapper, createFirstSessionCommand} from '@/widgets/chatbot';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {CopilotHeader} from './header';
import {DerivedObjective} from "@/services/data/tuples/derived-objective-types";
import {CONNECTED_DERIVED_OBJECTIVE_COMMANDS} from "@/console/derived-objective/copilot/commands";
import {startDerivedObjectiveCopilotSession} from "@/services/copilot/derived_objective";

export const Copilot = (props: {  derivedObjective: DerivedObjective  }) => {
	const {derivedObjective} = props;

	const askFirstCommand = () => {
		return {
			commands: [
				createFirstSessionCommand({
					greeting: Lang.COPILOT.DERIVED_OBJECTIVE.GREETING_FIRST_SESSION,
					action: async (sessionId: string) => startDerivedObjectiveCopilotSession(sessionId, derivedObjective.derivedObjectiveId,true)
				})
			]
		};
	};
	return <CopilotWrapper
		header={<CopilotHeader derivedObjective={derivedObjective}/>}
		greeting= {Lang.COPILOT.DERIVED_OBJECTIVE.HELLO}
		executionGrabSpace={true}
		commands={CONNECTED_DERIVED_OBJECTIVE_COMMANDS}
		askFirstCommand={askFirstCommand}/>;
};
