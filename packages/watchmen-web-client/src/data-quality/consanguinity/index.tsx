import {FullWidthPage} from '@/widgets/basic/page';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {createHelpCmd} from '../command';
import {Command} from '../command/types';
import {CLIWrapper} from '../widgets/cli';
import {AmbientBody, HeroHeader, HeroSubtitle, HeroTitle} from '../widgets/kit';
import {Execution} from './execution';
import {FlowCmd} from './flow/commands';
import {FlowHelpCmd} from './flow/help';
import {GraphCmd} from './graph/commands';
import {GraphHelpCmd} from './graph/help';
import {PipelineCmd} from './pipeline/commands';
import {PipelineHelpCmd} from './pipeline/help';
import {TopicCmd} from './topic/commands';
import {TopicHelpCmd} from './topic/help';

export const CONSANGUINITY_COMMANDS: Array<Command> = [PipelineCmd, TopicCmd, FlowCmd, GraphCmd];

export const CONSANGUINITY_HELP_COMMAND = createHelpCmd([PipelineHelpCmd, TopicHelpCmd, FlowHelpCmd, GraphHelpCmd]);

const DataQualityConsanguinityIndex = () => {
	useHelp(HELP_KEYS.DQC_CONSANGUINITY);

	return <FullWidthPage>
		<AmbientBody>
			<HeroHeader>
				<div>
					<HeroTitle>Consanguinity</HeroTitle>
					<HeroSubtitle>Trace topic, pipeline and factor blood relationships from a terminal.</HeroSubtitle>
				</div>
			</HeroHeader>
			<CLIWrapper greeting="This channel is for working on consanguinity."
			            commands={CONSANGUINITY_COMMANDS}
			            helpCommand={CONSANGUINITY_HELP_COMMAND}
			            execution={Execution}/>
		</AmbientBody>
	</FullWidthPage>;
};

export default DataQualityConsanguinityIndex;