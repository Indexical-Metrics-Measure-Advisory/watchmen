import {DecisionType} from '../types';

export const escapeHtml = (text: string) => text
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;');

export const decisionText = (type: DecisionType) => {
	if (type === 'accept') return 'Accept';
	if (type === 'reject') return 'Reject';
	return 'Investigate';
};
