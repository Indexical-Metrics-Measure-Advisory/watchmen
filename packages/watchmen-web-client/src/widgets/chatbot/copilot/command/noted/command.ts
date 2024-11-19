import {CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';
import {RetryCommand} from '../types';

export const CMD_YES = '/yes';

export interface YesCommand extends TextReplyCommand {
	askRestartCommand: () => Promise<RetryCommand>;
}

export const YesCmd: TextReplyCommand = {
	label: 'Yes',
	command: CMD_YES,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createYesCommand = (askRestartCommand: () => Promise<RetryCommand>): YesCommand => {
	return {...YesCmd, askRestartCommand};
};

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
