import {CommandPublishedBehaviorType} from '@/widgets/chatbot';
import {TextReplyCommand} from '../text-reply-command';

export const CMD_NEW_SESSION = '/new';

export type NewSessionCommand = TextReplyCommand;
export const NewSessionCmd: NewSessionCommand = {
	label: 'New Session',
	command: CMD_NEW_SESSION,
	reminder: 'Press "enter" to start a new session',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createFirstNewSessionCommand = (): NewSessionCommand => {
	return NewSessionCmd;
};