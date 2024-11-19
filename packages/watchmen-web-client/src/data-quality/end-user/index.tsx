import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {CLIWrapper, Command, createHelpCmd} from '@/widgets/chatbot';
import React from 'react';
import {Execution} from './execution';

export const RULES_COMMANDS: Array<Command> = [];

export const RULES_HELP_COMMAND = createHelpCmd([]);

const DataQualityEndUserIndex = () => {
	return <FullWidthPage>
		<FullWidthPageHeaderContainer>
			<PageTitle>End User's Console</PageTitle>
		</FullWidthPageHeaderContainer>
		<CLIWrapper greeting="This channel is for working on end user's console, spaces, reports, groups, users."
		            commands={RULES_COMMANDS}
		            helpCommand={RULES_HELP_COMMAND}
		            executionGrabSpace={false}
		            execution={Execution}/>
	</FullWidthPage>;
};

export default DataQualityEndUserIndex;