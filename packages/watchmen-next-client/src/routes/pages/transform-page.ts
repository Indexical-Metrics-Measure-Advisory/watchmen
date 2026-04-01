import {Store} from '../../state/store';
import {renderSimpleModulePage} from './simple-module-page';

export const renderTransformPage = (store: Store) =>
	renderSimpleModulePage(
		'Data Transformation',
		'Configure data movement and transformation pipelines.',
		`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
			${store.state.pipelines.map(pipeline => `
				<div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:16px">
					<div style="font-weight:600;font-size:14px;margin-bottom:4px">${pipeline.name}</div>
					<div style="font-size:12px;color:var(--text-tertiary)">${pipeline.type} · ${pipeline.enabled ? '✅ Enabled' : '⏸ Disabled'} · Validated: ${pipeline.validated ? 'Yes' : 'No'}</div>
				</div>
			`).join('')}
		</div>`
	);
