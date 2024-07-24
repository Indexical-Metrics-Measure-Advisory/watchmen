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
				case 'current-month':
				case 'previous-month':
					return {
						sessionId,
						data: [
							{
								type: CopilotAnswerItemType.MARKDOWN, content: `The following are some examples of the diagrams. 

\`\`\`mermaid
flowchart TB
    0("利益: 現在:336601.50,前回:336601.50,チェーン:336601.50")
    1["運用収支: 現在:80000.00,前回:80000.00,チェーン:80000.00"]
    2["保険料: 現在:263051.50,前回:263051.50,チェーン:263051.50"]
    3["経費: 現在:450.00,前回:450.00,チェーン:450.00"]
    4["責任準備金繰入: 現在:1500.00,前回:1500.00,チェーン:1500.00"]
    5["保険金: 現在:4500.00,前回:4500.00,チェーン:4500.00"]
    0 --> 1 & 2 & 3 & 4 & 5
\`\`\`

\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
\`\`\`

\`\`\`mermaid
quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]
\`\`\`

`
							}
						]
					};
				default:
					return {sessionId, data: ['I apologize, but I can\'t fully understand this option.']};
			}
		})()), 3000);
	});
};
