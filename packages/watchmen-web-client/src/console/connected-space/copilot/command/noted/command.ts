import {CommandPublishedBehaviorType} from '@/widgets/chatbot';
import {TextReplyCommand} from '../text-reply-command';

export const CMD_NOTED = '/noted';

export type NotedCommand = TextReplyCommand;
export const NotedCmd: NotedCommand = {
	label: 'Noted',
	command: CMD_NOTED,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};
