import {renderSimpleModulePage} from './simple-module-page';

export const renderGovernPage = () =>
	renderSimpleModulePage(
		'Data Governance',
		'Manage quality rules, masking policies, and security strategies.',
		`<div style="font-size:13px;color:var(--text-secondary)">
			<p>Active quality rules:</p>
			<ul style="margin-top:8px;padding-left:20px;list-style:disc">
				<li>Order Amount &gt; 0</li>
				<li>Valid Customer ID (regex: ^CUST-\\d{8}$)</li>
				<li>Duplicate Order Detection</li>
			</ul>
		</div>`
	);
