import {TextReplyCommand} from '@/console/connected-space/copilot/command/text-reply-command';
import {Command, CommandPublishedBehaviorType} from '@/widgets/chatbot';

export const CMD_NEW_SESSION = '/new';

export const NewSessionCmd: Command = {
	label: 'New Session',
	command: CMD_NEW_SESSION,
	reminder: 'Press "enter" to start a new session',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createFirstNewSessionCommand = (): TextReplyCommand => {
	return NewSessionCmd;
};