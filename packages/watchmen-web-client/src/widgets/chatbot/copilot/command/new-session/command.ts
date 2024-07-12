import {CopilotAnswerWithSession} from '@/services/copilot/types';
import {CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';
import {RetryCommand} from '../types';

export const CMD_NEW_SESSION = '/new';

export interface NewSessionCommand extends TextReplyCommand {
	greeting: string;
	action: (sessionId: string) => Promise<CopilotAnswerWithSession>;
	restartGreeting: string;
	askRestartCommand?: () => Promise<RetryCommand>;
}

export const NewSessionCmd: TextReplyCommand = {
	label: 'New Session',
	command: CMD_NEW_SESSION,
	reminder: 'Press "enter" to start a new session',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createFirstNewSessionCommand = (options: {
	greeting: string;
	action: NewSessionCommand['action'];
	restartGreeting: string;
	askRestartCommand?: NewSessionCommand['askRestartCommand']
}): NewSessionCommand => {
	const {greeting, action, restartGreeting, askRestartCommand} = options;

	return {...NewSessionCmd, greeting, action, restartGreeting, askRestartCommand};
};
