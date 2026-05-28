import { Store } from "../../state/store";
import { pipelineTypeLabel, pipelineStatus, healthLabel } from "../../utils/display";
import { getPipelineStats, getPipelineTopicMap } from "../../services";

export const renderTransformPage = (store: Store) => {
	const pipelines = store.state.pipelines;
	const stats = getPipelineStats(pipelines);
	const topicMap = getPipelineTopicMap(store.state.topics);

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Transformation</div>
			<div class="wm-page-hero-desc">Configure and monitor data movement and transformation pipelines</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.total}</div>
					<div class="wm-hero-kpi-label">Total Pipelines</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${stats.running}</div>
					<div class="wm-hero-kpi-label">Running</div>
				</div>
				<div class="wm-hero-kpi red">
					<div class="wm-hero-kpi-val">${stats.failing}</div>
					<div class="wm-hero-kpi-label">Failing</div>
				</div>
				<div class="wm-hero-kpi orange">
					<div class="wm-hero-kpi-val">${stats.degraded + stats.disabled}</div>
					<div class="wm-hero-kpi-label">Degraded/Disabled</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Pipeline Catalog</div>
				<div class="wm-section-hint">${pipelines.length} pipelines · ${stats.running} healthy · ${stats.failing + stats.degraded} need attention</div>
			</div>
			<div class="wm-pipeline-grid">
				${pipelines
					.map((p) => {
						const topic = topicMap.get(p.topicId);
						return `
					<div class="wm-pipeline-card ${p.healthStatus === "error" ? "border-error" : p.healthStatus === "warning" || !p.validated ? "border-warning" : ""}">
						<div class="wm-pipeline-card-top">
							<div class="wm-pipeline-name">${p.name}</div>
							<div class="wm-pipeline-type-badge">${pipelineTypeLabel(p.type)}</div>
						</div>
						<div class="wm-pipeline-card-body">
							<div class="wm-pipeline-stat">
								<div class="wm-pipeline-stat-val">${pipelineStatus(p)}</div>
								<div class="wm-pipeline-stat-label">Status</div>
							</div>
							<div class="wm-pipeline-stat">
								<div class="wm-pipeline-stat-val">${p.validated ? '<span class="wm-check">✓</span> Validated' : '<span class="wm-check warn">⚠</span> Pending'}</div>
								<div class="wm-pipeline-stat-label">Validation</div>
							</div>
							<div class="wm-pipeline-stat">
								<div class="wm-pipeline-stat-val">${p.lastRun ? p.lastRun.slice(11, 19) : "—"}</div>
								<div class="wm-pipeline-stat-label">Last Run</div>
							</div>
						</div>
						<div class="wm-pipeline-card-foot">
							${topic ? `<span class="wm-pipeline-topic">${topic.name}</span>` : ""}
							<span class="wm-pipeline-health">${healthLabel(p.healthStatus)}</span>
						</div>
					</div>
					`;
					})
					.join("")}
			</div>
		</div>
	</div>`;
};
