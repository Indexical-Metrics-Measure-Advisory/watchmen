import {CopilotAnswerItemType, CopilotAnswerWithSession} from '../types';

export const mockAskOptionDetails = async (sessionId: string, token: string): Promise<CopilotAnswerWithSession> => {
	return new Promise<CopilotAnswerWithSession>(resolve => {
		setTimeout(() => resolve((() => {
			switch (token) {
				case 'A: Sales performance':
				case 'B: Sales efficiency':
				case 'C: Claims statistics':
					return {
						sessionId,
						data: [
							'Currently, I can only provide monthly statistical data. May I ask if you need data for the current month, the previous month ',
							{type: CopilotAnswerItemType.OPTION, text: 'the current month', token: 'current-month'},
							', ',
							{type: CopilotAnswerItemType.OPTION, text: 'the previous month', token: 'previous-month'},
							', or if you could directly provide me with the year and month?'
						]
					};
				default:
					return {sessionId, data: ['I apologize, but I can\'t fully understand this option.']};
			}
		})()), 3000);
	});
};
