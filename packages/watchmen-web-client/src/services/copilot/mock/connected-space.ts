import {CopilotAnswerItemType, CopilotAnswerWithSession} from '../types';

export const mockStartConnectedSpaceCopilotSession = async (sessionId: string, withRecommendation: boolean): Promise<CopilotAnswerWithSession> => {
	return new Promise<CopilotAnswerWithSession>(resolve => {
		setTimeout(() => resolve((() => {
			if (withRecommendation) {
				return {
					sessionId,
					data: [
						'Here are some recommendations: ',
						{
							type: CopilotAnswerItemType.OPTION,
							text: 'A: Sales performance', token: 'A: Sales performance', vertical: true
						},
						{type: CopilotAnswerItemType.OPTION, text: 'B: Sales efficiency', token: 'B: Sales efficiency'},
						{
							type: CopilotAnswerItemType.OPTION,
							text: 'C: Claims statistics', token: 'C: Claims statistics'
						},
						'If any of these interest you, you can click on the links to let me know, or just tell me your preferences directly.'
					]
				};
			} else {
				return {sessionId, data: []};
			}
		})()), 3000);
	});
};
