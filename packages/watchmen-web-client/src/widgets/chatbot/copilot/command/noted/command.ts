import {CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';

export const CMD_NOTED = '/noted';

export interface NotedCommand extends TextReplyCommand {
	greeting?: string;
}

export const NotedCmd: NotedCommand = {
	label: 'Noted',
	command: CMD_NOTED,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};
