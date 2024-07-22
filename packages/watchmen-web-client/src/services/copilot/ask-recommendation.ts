import {Apis, post} from '../data/apis';
import {isMockService} from '../data/utils';
import {mockAskRecommendation} from './mock/ask-recommendation';
import {CopilotAnswerWithSession, RecommendationType} from './types';

export const askRecommendation = async (sessionId: string, type: RecommendationType): Promise<CopilotAnswerWithSession> => {
	if (isMockService()) {
		return await mockAskRecommendation(sessionId, type);
	} else {
		const data = await post({
			api: Apis.COPILOT_ASK_DERIVED_OBJECTIVE,
			data: {sessionId, type}
		});

		return {sessionId: data.sessionId, ...(data.answer ?? {})};
	}
};
