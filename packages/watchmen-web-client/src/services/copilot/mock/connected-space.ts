import {ConnectedSpaceCopilotSession, CopilotAnswerType} from '../types';

export const mockStartConnectedSpaceCopilotSession = async (sessionId: string, withRecommendation: boolean): Promise<ConnectedSpaceCopilotSession> => {
	return new Promise<ConnectedSpaceCopilotSession>(resolve => {
		setTimeout(() => {
			if (withRecommendation) {
				resolve({
					sessionId, type: CopilotAnswerType.TEXT_WITH_OPTIONS,
					text: [
						'Here are some recommendations: ',
						{text: 'A: Sales performance', token: 'A: Sales performance', vertical: true},
						{text: 'B: Sales efficiency', token: 'B: Sales efficiency'},
						{text: 'C: Claims statistics', token: 'C: Claims statistics'},
						'If any of these interest you, you can click on the links to let me know, or just tell me your preferences directly.'
					]
				});
			} else {
				resolve({sessionId, type: CopilotAnswerType.TEXT_WITH_OPTIONS, text: []});
			}
		}, 3000);
	});
};
