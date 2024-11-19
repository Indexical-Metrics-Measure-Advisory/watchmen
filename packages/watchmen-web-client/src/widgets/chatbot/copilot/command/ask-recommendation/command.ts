import {CopilotAnswerWithSession} from '@/services/copilot/types';
import {Command, CommandPublishedBehaviorBackward, CommandPublishedBehaviorType} from '../../../command';
import {TextReplyCommand} from '../../types';

export const CMD_DO_ASK_RECOMMENDATION = '/do ask recommendation';

export interface DoAskRecommendationCommand extends TextReplyCommand {
	greeting?: string;
	action: (sessionId: string) => Promise<CopilotAnswerWithSession>;
}

export const DoAskRecommendationCmd: Command = {
	label: 'Do Ask Recommendation',
	command: CMD_DO_ASK_RECOMMENDATION,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createDoAskRecommendationCommand = (options: {
	replyTo?: string;
	greeting?: string;
	action: DoAskRecommendationCommand['action'];
}): DoAskRecommendationCommand => {
	const {greeting, action, replyTo} = options;
	return {...DoAskRecommendationCmd, greeting, action, replyTo};
};

export const CMD_ASK_RECOMMENDATION = '/ask recommendation';

export interface AskRecommendationCommand extends TextReplyCommand {
	greeting?: string;
	action: (sessionId: string) => Promise<CopilotAnswerWithSession>;
}

export const AskRecommendationCmd: Command = {
	label: 'Ask Recommendation',
	command: CMD_ASK_RECOMMENDATION,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [{
		// make sure command can be executed by tailing any text
		label: '', command: '', reminder: '',
		published: {type: CommandPublishedBehaviorType.BACKWARD, steps: 1} as CommandPublishedBehaviorBackward,
		trails: [], executableOnNoTrail: true
	}],
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



