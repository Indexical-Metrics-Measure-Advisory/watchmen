import {Store} from '../../state/store';
import {Pipeline, PipelineTriggerType} from '../../types';

const pipelineTypeLabel = (t: PipelineTriggerType): string => {
	const map: Record<PipelineTriggerType, string> = {
		'insert': 'INSERT',
		'merge': 'MERGE',
		'insert-or-merge': 'UPSERT',
		'delete': 'DELETE',
	};
	return map[t] || t;
};

const healthLabel = (s?: string): string => {
	if (!s) return '';
	const map: Record<string, string> = {
		healthy: '<span class="wm-status-dot healthy"></span>Healthy',
		warning: '<span class="wm-status-dot warning"></span>Warning',
		error: '<span class="wm-status-dot error"></span>Error',
	};
	return map[s] || '';
};

const pipelineStatus = (p: Pipeline): string => {
	if (!p.enabled) return '<span class="wm-pipeline-status disabled">Disabled</span>';
	if (p.healthStatus === 'error') return '<span class="wm-pipeline-status error">Failing</span>';
	if (p.healthStatus === 'warning') return '<span class="wm-pipeline-status warning">Degraded</span>';
	if (!p.validated) return '<span class="wm-pipeline-status warning">Unvalidated</span>';
	return '<span class="wm-pipeline-status healthy">Running</span>';
};

export const renderTransformPage = (store: Store) => {
	const pipelines = store.state.pipelines;
	const runningCount = pipelines.filter(p => p.enabled && p.healthStatus === 'healthy').length;
	const failingCount = pipelines.filter(p => p.enabled && p.healthStatus === 'error').length;
	const degradedCount = pipelines.filter(p => p.enabled && (p.healthStatus === 'warning' || !p.validated)).length;
	const disabledCount = pipelines.filter(p => !p.enabled).length;

	const topicMap = new Map(store.state.topics.map(t => [t.topicId, t]));

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Transformation</div>
			<div class="wm-page-hero-desc">Configure and monitor data movement and transformation pipelines</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${pipelines.length}</div>
					<div class="wm-hero-kpi-label">Total Pipelines</div>
				</div>
				<div class="wm-hero-kpi green">
					<div class="wm-hero-kpi-val">${runningCount}</div>
					<div class="wm-hero-kpi-label">Running</div>
				</div>
				<div class="wm-hero-kpi red">
					<div class="wm-hero-kpi-val">${failingCount}</div>
					<div class="wm-hero-kpi-label">Failing</div>
				</div>
				<div class="wm-hero-kpi orange">
					<div class="wm-hero-kpi-val">${degradedCount + disabledCount}</div>
					<div class="wm-hero-kpi-label">Degraded/Disabled</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Pipeline Catalog</div>
				<div class="wm-section-hint">${pipelines.length} pipelines · ${runningCount} healthy · ${failingCount + degradedCount} need attention</div>
			</div>
			<div class="wm-pipeline-grid">
				${pipelines.map(p => {
					const topic = topicMap.get(p.topicId);
					return `
					<div class="wm-pipeline-card ${p.healthStatus === 'error' ? 'border-error' : p.healthStatus === 'warning' || !p.validated ? 'border-warning' : ''}">
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
								<div class="wm-pipeline-stat-val">${p.lastRun ? p.lastRun.slice(11, 19) : '—'}</div>
								<div class="wm-pipeline-stat-label">Last Run</div>
							</div>
						</div>
						<div class="wm-pipeline-card-foot">
							${topic ? `<span class="wm-pipeline-topic">${topic.name}</span>` : ''}
							<span class="wm-pipeline-health">${healthLabel(p.healthStatus)}</span>
						</div>
					</div>
					`;
				}).join('')}
			</div>
		</div>
	</div>`;
};