import {Command, CommandPublishedBehaviorType} from '@/widgets/chatbot';
import {TextReplyCommand} from '../text-reply-command';

export const CMD_ASK_RECOMMENDATION = '/recommendation';

export interface AskRecommendationCommand extends TextReplyCommand {
}

export const AskRecommendationCmd: Command = {
	label: 'Ask Recommendation',
	command: CMD_ASK_RECOMMENDATION,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createAskRecommendationCommand = (replyTo?: string): AskRecommendationCommand => {
	return {...AskRecommendationCmd, replyTo};
};
