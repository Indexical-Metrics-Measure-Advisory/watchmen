import {CopilotAnswerWithSession} from '@/services/copilot/types';
import {Command, CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';

export const CMD_ASK_RECOMMENDATION = '/recommendation';

export interface AskRecommendationCommand extends TextReplyCommand {
	greeting?: string;
	action: (sessionId: string) => Promise<CopilotAnswerWithSession>;
}

export const AskRecommendationCmd: Command = {
	label: 'Ask Recommendation',
	command: CMD_ASK_RECOMMENDATION,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createAskRecommendationCommand = (options: {
	replyTo?: string;
	greeting?: string;
	action: AskRecommendationCommand['action'];
}): AskRecommendationCommand => {
	const {greeting, action, replyTo} = options;
	return {...AskRecommendationCmd, greeting, action, replyTo};
};
