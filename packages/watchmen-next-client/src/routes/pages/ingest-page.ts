import {Store} from '../../state/store';
import {renderSimpleModulePage} from './simple-module-page';

export const renderIngestPage = (store: Store) =>
	renderSimpleModulePage(
		'Data Ingestion',
		'Manage external data source connections and sync settings.',
		`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
			${store.state.dataSources.map(ds => `
				<div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:16px">
					<div style="font-weight:600;font-size:14px;margin-bottom:4px">${ds.name}</div>
					<div style="font-size:12px;color:var(--text-tertiary)">${ds.dataSourceType.toUpperCase()} · ${ds.host || 'N/A'}</div>
				</div>
			`).join('')}
		</div>`
	);
