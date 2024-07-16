import {OngoingCopilotAnswer} from '@/services/copilot/types';
import {Command, CommandPublishedBehaviorBackward, CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';

export const CMD_FREE_TEXT = '/';

export interface FreeTextCommand extends Command {
}

export const FreeTextContentCmd: Command = {
	label: '',
	command: '',
	reminder: 'Press "enter" to send.',
	published: {type: CommandPublishedBehaviorType.BACKWARD, steps: 1} as CommandPublishedBehaviorBackward,
	trails: [],
	executableOnNoTrail: true
};

export const FreeTextCmd: FreeTextCommand = {
	label: '💭',
	command: CMD_FREE_TEXT,
	reminder: 'Start chatting by entering your message.',
	published: {type: CommandPublishedBehaviorType.KEEP},
	trails: [FreeTextContentCmd],
	executableOnNoTrail: false
};

export const CMD_DO_FREE_TEXT = '/do free text';

export interface DoFreeTextCommand extends TextReplyCommand {
	greeting?: string;
	action: (sessionId: string, token?: string) => Promise<OngoingCopilotAnswer>;
}

export const DoFreeTextCmd: Command = {
	label: 'Do Free Text',
	command: CMD_DO_FREE_TEXT,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createDoFreeTextCommand = (options: {
	replyTo?: string;
	greeting?: string;
	action: DoFreeTextCommand['action'];
}): DoFreeTextCommand => {
	const {greeting, action, replyTo} = options;
	return {...DoFreeTextCmd, greeting, action, replyTo};
};
