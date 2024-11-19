import {Apis, post} from '../data/apis';
import {isMockService} from '../data/utils';
import {mockAskOptionDetails} from './mock/ask-option-details';
import {CopilotAnswerWithSession} from './types';

export const askOptionDetails = async (sessionId: string, token: string,action:string): Promise<CopilotAnswerWithSession> => {
	if (isMockService()) {
		return await mockAskOptionDetails(sessionId, token);
	} else {
		const data = await post({
			api: Apis.COPILOT_ASK_OPTION_DETAILS,
			data: {sessionId, token, action}
		});

		return data
	}
};
