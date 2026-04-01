export const renderSimpleModulePage = (title: string, description: string, content: string) => `
	<div class="wm-section-card">
		<div class="wm-section-header">
			<div class="wm-section-title">${title}</div>
		</div>
		<div style="padding:24px">
			<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">${description}</div>
			${content}
		</div>
	</div>
`;
