import {Command, CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';
import {RetryCommand} from '../types';

export const CMD_RESTART_SESSION = '/restart session';

export interface RestartSessionCommand extends Command {
	greeting: string;
	askRestartCommand?: () => Promise<RetryCommand>;
}

export const RestartSessionCmd: TextReplyCommand = {
	label: 'Restart Session',
	command: CMD_RESTART_SESSION,
	reminder: 'Press "enter" to restart a new session',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createRestartSessionCommand = (options: {
	greeting: string;
	askRestartCommand?: RestartSessionCommand['askRestartCommand']
}): RestartSessionCommand => {
	const {greeting, askRestartCommand} = options;

	return {...RestartSessionCmd, greeting, askRestartCommand};
};

export const CMD_DO_RESTART_SESSION = '/do restart session';

export interface DoRestartSessionCommand extends Command {
	greeting: string;
	askRestartCommand?: () => Promise<RetryCommand>;
}

export const createDoRestartSessionCommand = (options: {
	greeting: string;
	askRestartCommand?: DoRestartSessionCommand['askRestartCommand']
}): DoRestartSessionCommand => {
	const {greeting, askRestartCommand} = options;

	return {
		label: 'Do Restart Session',
		command: CMD_DO_RESTART_SESSION,
		reminder: '',
		published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
		trails: [],
		executableOnNoTrail: true,
		greeting, askRestartCommand
	};
};
