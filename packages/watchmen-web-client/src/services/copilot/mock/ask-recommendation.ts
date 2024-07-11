import {CopilotAnswerItemType, Recommendation, RecommendationType} from '../types';

export const mockAskRecommendation = async (sessionId: string, type: RecommendationType): Promise<Recommendation> => {
	return new Promise<Recommendation>(resolve => {
		setTimeout(() => resolve((() => {
			switch (type) {
				case RecommendationType.CONNECTED_SPACE:
					return {
						sessionId,
						data: [
							'Here are some recommendations: ',
							{
								type: CopilotAnswerItemType.OPTION,
								text: 'A: Sales performance', token: 'A: Sales performance', vertical: true
							},
							{
								type: CopilotAnswerItemType.OPTION,
								text: 'B: Sales efficiency',
								token: 'B: Sales efficiency'
							},
							{
								type: CopilotAnswerItemType.OPTION,
								text: 'C: Claims statistics',
								token: 'C: Claims statistics'
							},
							'If any of these interest you, you can click on the links to let me know, or just tell me your preferences directly.'
						]
					};
				default:
					return {sessionId, data: []};
			}
		})()), 3000);
	});
};
