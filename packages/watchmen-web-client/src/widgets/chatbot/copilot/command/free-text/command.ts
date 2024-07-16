import {Command, CommandPublishedBehaviorBackward, CommandPublishedBehaviorType} from '../../../command';

export const CMD_FREE_TEXT = '/';

export interface FreeTextCommand extends Command {
}

export const FreeTextContentCmd: Command = {
	label: '',
	command: '',
	reminder: 'Start chatting by entering your message.',
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
