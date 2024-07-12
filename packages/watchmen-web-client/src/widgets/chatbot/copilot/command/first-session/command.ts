import {CopilotAnswerWithSession} from '@/services/copilot/types';
import {CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';

export const CMD_FIRST_SESSION = '/first session';

export interface FirstSessionCommand extends TextReplyCommand {
	greeting: string;
	action: (sessionId: string) => Promise<CopilotAnswerWithSession>;
}

export const FirstSessionCmd: TextReplyCommand = {
	label: 'First Session',
	command: CMD_FIRST_SESSION,
	reminder: 'Press "enter" to start first session',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createFirstSessionCommand = (options: {
	greeting: string;
	action: FirstSessionCommand['action'];
}): FirstSessionCommand => {
	const {greeting, action} = options;

	return {...FirstSessionCmd, greeting, action};
};
