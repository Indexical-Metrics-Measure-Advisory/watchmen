import {AppState, PendingChange} from '../types';
import {decisionText, escapeHtml} from '../utils/format';

export const renderReviewQueue = (state: AppState, pendingChanges: Array<PendingChange>) => `
<div class="wm-card">
	<h3 class="wm-title">Review Queue（待确认）</h3>
	<div class="wm-list">
		${pendingChanges.map(change => `
		<div class="wm-list-item">
			<div><strong>${escapeHtml(change.title)}</strong> · ${escapeHtml(change.target)}
				<span class="wm-badge ${change.severity}">${change.severity.toUpperCase()}</span>
			</div>
			<div class="wm-mini">${escapeHtml(change.type)}</div>
			<div class="wm-btn-group">
				<button class="wm-btn" data-action="accept" data-change="${change.id}">Accept</button>
				<button class="wm-btn reject" data-action="reject" data-change="${change.id}">Reject</button>
				<button class="wm-btn investigate" data-action="investigate" data-change="${change.id}">Investigate</button>
			</div>
		</div>`).join('')}
	</div>
</div>
<div class="wm-card">
	<h3 class="wm-title">Decision History</h3>
	<div class="wm-list">
		${state.decisions.length === 0 ? '<div class="wm-mini">No decision yet.</div>' : state.decisions.slice(-8).reverse().map(record => {
			const source = pendingChanges.find(change => change.id === record.changeId);
			return `<div class="wm-list-item">${record.at} · <strong>${decisionText(record.decision)}</strong> · ${escapeHtml(source?.title ?? record.changeId)}</div>`;
		}).join('')}
	</div>
</div>`;
