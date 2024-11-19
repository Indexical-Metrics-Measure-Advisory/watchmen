import {Command, createHelpCmd} from '@/widgets/chatbot';
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
