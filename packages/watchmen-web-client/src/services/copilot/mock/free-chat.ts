import {CopilotAnswerWithSession} from '../types';

export const mockFreeChat = async (sessionId: string, replyTo: string): Promise<CopilotAnswerWithSession> => {
	return new Promise<CopilotAnswerWithSession>(resolve => {
		setTimeout(() => resolve((() => {
			return {
				sessionId, data: [
					`Reply to: ${replyTo}.`
				]
			};
		})()), 500 + Math.random() * 500);
	});
};
