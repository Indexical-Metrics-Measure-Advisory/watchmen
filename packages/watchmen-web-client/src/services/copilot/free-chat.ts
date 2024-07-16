import {Apis, post} from '../data/apis';
import {isMockService} from '../data/utils';
import {mockFreeChat} from './mock/free-chat';
import {OngoingCopilotAnswer} from './types';

export const freeChat = async (sessionId: string, replyTo: string, token?: string): Promise<OngoingCopilotAnswer> => {
	if (isMockService()) {
		return await mockFreeChat(sessionId, replyTo, token);
	} else {
		const data = await post({
			api: Apis.COPILOT_FREE_CHAT,
			data: {sessionId, replyTo, token}
		});

		return {sessionId: data.sessionId, ...(data.answer ?? {})};
	}
};
