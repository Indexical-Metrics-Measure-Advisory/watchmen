import {renderSimpleModulePage} from './simple-module-page';

export const renderFeedbackPage = () =>
	renderSimpleModulePage(
		'Decision Feedback',
		'Review human-in-the-loop decisions and automated feedback actions.',
		`<div style="font-size:13px;color:var(--text-secondary)">
			<p>Collaborative decision-making is handled in the Perceive module. When the agent detects a change, users can approve or reject it, and the system records the decision for the next perception cycle.</p>
		</div>`
	);
