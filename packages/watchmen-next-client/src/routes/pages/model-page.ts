import {Store} from '../../state/store';
import {renderSimpleModulePage} from './simple-module-page';

export const renderModelPage = (store: Store) =>
	renderSimpleModulePage(
		'Data Modeling',
		'Define Watchmen topic models and factor structures.',
		`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
			${store.state.topics.map(topic => `
				<div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:16px">
					<div style="font-weight:600;font-size:14px;margin-bottom:4px">${topic.name}</div>
					<div style="font-size:12px;color:var(--text-tertiary)">${topic.type.toUpperCase()} · ${topic.kind} · ${topic.factors.length} factors</div>
					<div style="font-size:12px;color:var(--text-secondary);margin-top:6px;font-style:italic">${topic.description || ''}</div>
				</div>
			`).join('')}
		</div>`
	);
