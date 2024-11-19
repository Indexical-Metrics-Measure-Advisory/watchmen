import {v4} from 'uuid';
import {isBlank} from '../../utils';
import {OngoingCopilotAnswer} from '../types';

export const mockFreeChat = async (sessionId: string, replyTo: string, token?: string): Promise<OngoingCopilotAnswer> => {
	return new Promise<OngoingCopilotAnswer>(resolve => {
		setTimeout(() => resolve((() => {
			if (replyTo.startsWith('##') && isBlank(token)) {
				return {sessionId, token: v4(), data: []};
			} else {
				return {
					sessionId, data: [
						`Reply to[token=${token || ''}]: ${replyTo}.`
					]
				};
			}
		})()), 500 + Math.random() * 500);
	});
};
