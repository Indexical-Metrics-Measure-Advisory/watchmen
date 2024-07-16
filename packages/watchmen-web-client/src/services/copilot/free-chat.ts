import {Apis, post} from '../data/apis';
import {isMockService} from '../data/utils';
import {mockFreeChat} from './mock/free-chat';
import {CopilotAnswerWithSession} from './types';

export const freeChat = async (sessionId: string, replyTo: string): Promise<CopilotAnswerWithSession> => {
	if (isMockService()) {
		return await mockFreeChat(sessionId, replyTo);
	} else {
		const data = await post({
			api: Apis.COPILOT_FREE_CHAT,
			data: {sessionId, replyTo}
		});

		return {sessionId: data.sessionId, ...(data.answer ?? {})};
	}
};
