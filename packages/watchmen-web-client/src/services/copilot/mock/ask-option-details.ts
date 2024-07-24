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
flowchart LR
    x("hello")
    y["world"]
    x --> y
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
