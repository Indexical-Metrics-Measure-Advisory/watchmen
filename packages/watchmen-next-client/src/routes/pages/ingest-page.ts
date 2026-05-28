import { Store } from "../../state/store";
import { healthBadge, formatCount, sourceTypeIcon } from "../../utils/display";
import { getDataSourceHealthCounts, getDataSourceDomains } from "../../services";

export const renderIngestPage = (store: Store) => {
	const sources = store.state.dataSources;
	const counts = getDataSourceHealthCounts(sources);
	const domains = getDataSourceDomains(sources);

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Ingestion</div>
			<div class="wm-page-hero-desc">Manage external data source connections and monitor sync health</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${counts.total}</div>
					<div class="wm-hero-kpi-label">Total Sources</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${counts.healthy}</div>
					<div class="wm-hero-kpi-label">Healthy</div>
				</div>
				<div class="wm-hero-kpi orange">
					<div class="wm-hero-kpi-val">${counts.warning}</div>
					<div class="wm-hero-kpi-label">Warning</div>
				</div>
				<div class="wm-hero-kpi red">
					<div class="wm-hero-kpi-val">${counts.error}</div>
					<div class="wm-hero-kpi-label">Error</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Source Catalog</div>
				<div class="wm-section-hint">${sources.length} data sources across ${domains.length} domains</div>
			</div>
			<div class="wm-source-grid">
				${sources
					.map(
						(ds) => `
				<div class="wm-source-card ${ds.healthStatus === "error" ? "border-error" : ds.healthStatus === "warning" ? "border-warning" : ""}">
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
							<div class="wm-source-stat-val">${ds.domain || "—"}</div>
							<div class="wm-source-stat-label">Domain</div>
						</div>
						<div class="wm-source-stat">
							<div class="wm-source-stat-val">${formatCount(ds.recordCount)}</div>
							<div class="wm-source-stat-label">Records</div>
						</div>
						<div class="wm-source-stat">
							<div class="wm-source-stat-val">${ds.lastSync ? ds.lastSync.slice(11, 19) : "—"}</div>
							<div class="wm-source-stat-label">Last Sync</div>
						</div>
					</div>
					<div class="wm-source-card-foot">
						${ds.host ? `<span class="wm-source-endpoint">${ds.host}${ds.port ? ":" + ds.port : ""}</span>` : ""}
						${ds.url ? `<span class="wm-source-endpoint">${ds.url}</span>` : ""}
						<span class="wm-source-code">${ds.dataSourceCode}</span>
					</div>
				</div>
				`,
					)
					.join("")}
			</div>
		</div>
	</div>`;
};
