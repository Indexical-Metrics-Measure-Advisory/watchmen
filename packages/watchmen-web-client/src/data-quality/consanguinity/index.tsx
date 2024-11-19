import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {CLIWrapper} from '@/widgets/chatbot';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {CONSANGUINITY_COMMANDS, CONSANGUINITY_HELP_COMMAND} from './commands';
import {Execution} from './execution';

const DataQualityConsanguinityIndex = () => {
	useHelp(HELP_KEYS.DQC_CONSANGUINITY);

	return <FullWidthPage>
		<FullWidthPageHeaderContainer>
			<PageTitle>Consanguinity</PageTitle>
		</FullWidthPageHeaderContainer>
		<CLIWrapper greeting="This channel is for working on consanguinity."
		            commands={CONSANGUINITY_COMMANDS}
		            helpCommand={CONSANGUINITY_HELP_COMMAND}
		            executionGrabSpace={false}
		            execution={Execution}/>
	</FullWidthPage>;
};

export default DataQualityConsanguinityIndex;