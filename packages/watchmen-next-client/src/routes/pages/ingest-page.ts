import {Store} from '../../state/store';
import {DataSourceType, HealthStatus} from '../../types';

const sourceTypeIcon = (t: DataSourceType): string => {
	const map: Record<DataSourceType, string> = {
		mysql: '🐬',
		postgresql: '🐘',
		mongodb: '🍃',
		oracle: '🔴',
		mssql: '🟦',
		snowflake: '❄️',
		oss: '☁️',
		s3: '🪣',
		adls: '📦',
	};
	return map[t] || '💾';
};

const healthBadge = (s: HealthStatus): string => {
	switch (s) {
		case 'healthy': return '<span class="wm-status-dot healthy"></span><span>Healthy</span>';
		case 'warning': return '<span class="wm-status-dot warning"></span><span>Warning</span>';
		case 'error': return '<span class="wm-status-dot error"></span><span>Error</span>';
		default: return '<span class="wm-status-dot unknown"></span><span>Unknown</span>';
	}
};

const formatCount = (n?: number): string => {
	if (n == null) return '—';
	if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
	if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
	return String(n);
};

export const renderIngestPage = (store: Store) => {
	const sources = store.state.dataSources;
	const healthyCount = sources.filter(s => s.healthStatus === 'healthy').length;
	const warningCount = sources.filter(s => s.healthStatus === 'warning').length;
	const errorCount = sources.filter(s => s.healthStatus === 'error').length;

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Ingestion</div>
			<div class="wm-page-hero-desc">Manage external data source connections and monitor sync health</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${sources.length}</div>
					<div class="wm-hero-kpi-label">Total Sources</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${healthyCount}</div>
					<div class="wm-hero-kpi-label">Healthy</div>
				</div>
				<div class="wm-hero-kpi orange">
					<div class="wm-hero-kpi-val">${warningCount}</div>
					<div class="wm-hero-kpi-label">Warning</div>
				</div>
				<div class="wm-hero-kpi red">
					<div class="wm-hero-kpi-val">${errorCount}</div>
					<div class="wm-hero-kpi-label">Error</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Source Catalog</div>
				<div class="wm-section-hint">${sources.length} data sources across ${[...new Set(sources.map(s => s.domain))].length} domains</div>
			</div>
			<div class="wm-source-grid">
				${sources.map(ds => `
				<div class="wm-source-card ${ds.healthStatus === 'error' ? 'border-error' : ds.healthStatus === 'warning' ? 'border-warning' : ''}">
					<div class="wm-source-card-top">
						<div class="wm-source-icon">${sourceTypeIcon(ds.dataSourceType)}</div>
						<div class="wm-source-info">
							<div class="wm-source-name">${ds.name}</div>
							<div class="wm-source-type">${ds.dataSourceType.toUpperCase()}</div>
						</div>
						<div class="wm-source-health">${healthBadge(ds.healthStatus)}</div>
					</div>
					<div class="wm-source-card-body">
						<div class="wm-source-stat">
							<div class="wm-source-stat-val">${ds.domain || '—'}</div>
							<div class="wm-source-stat-label">Domain</div>
						</div>
						<div class="wm-source-stat">
							<div class="wm-source-stat-val">${formatCount(ds.recordCount)}</div>
							<div class="wm-source-stat-label">Records</div>
						</div>
						<div class="wm-source-stat">
							<div class="wm-source-stat-val">${ds.lastSync ? ds.lastSync.slice(11, 19) : '—'}</div>
							<div class="wm-source-stat-label">Last Sync</div>
						</div>
					</div>
					<div class="wm-source-card-foot">
						${ds.host ? `<span class="wm-source-endpoint">${ds.host}${ds.port ? ':' + ds.port : ''}</span>` : ''}
						${ds.url ? `<span class="wm-source-endpoint">${ds.url}</span>` : ''}
						<span class="wm-source-code">${ds.dataSourceCode}</span>
					</div>
				</div>
				`).join('')}
			</div>
		</div>
	</div>`;
};