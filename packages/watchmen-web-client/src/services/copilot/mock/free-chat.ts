import {OngoingCopilotAnswer} from '../types';

export const mockFreeChat = async (sessionId: string, replyTo: string, token?: string): Promise<OngoingCopilotAnswer> => {
	return new Promise<OngoingCopilotAnswer>(resolve => {
		setTimeout(() => resolve((() => {
			return {
				sessionId, data: [
					`Reply to[token=${token || ''}]: ${replyTo}.`
				]
			};
		})()), 500 + Math.random() * 500);
	});
};
