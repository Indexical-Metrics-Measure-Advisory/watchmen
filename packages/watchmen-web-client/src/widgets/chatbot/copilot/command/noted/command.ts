import {CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';

export const CMD_NO = '/no';

export interface NoCommand extends TextReplyCommand {
}

export const NoCmd: NoCommand = {
	label: 'No',
	command: CMD_NO,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

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
