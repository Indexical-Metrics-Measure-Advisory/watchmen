import {Apis, post} from '../data/apis';
import {isMockService} from '../data/utils';
import {mockStartConnectedSpaceCopilotSession} from './mock/connected-space';
import {CopilotAnswerWithSession} from './types';

export const startConnectedSpaceCopilotSession = async (sessionId: string, withRecommendation: boolean): Promise<CopilotAnswerWithSession> => {
	if (isMockService()) {
		return await mockStartConnectedSpaceCopilotSession(sessionId, withRecommendation);
	} else {
		const data = await post({
			api: Apis.COPILOT_CREATE_CONNECTED_SPACE_SESSION,
			data: {sessionId, recommendation: withRecommendation}
		});

		return {sessionId: data.sessionId, ...(data.answer ?? {})};
	}
};