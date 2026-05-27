import {Store} from '../../state/store';
import {Topic} from '../../types';

const topicTypeBadge = (t: Topic['type']): string => {
	const map: Record<string, string> = {
		raw: '<span class="wm-topic-badge raw">RAW</span>',
		meta: '<span class="wm-topic-badge meta">META</span>',
		distinct: '<span class="wm-topic-badge distinct">DISTINCT</span>',
		aggregate: '<span class="wm-topic-badge aggregate">AGGREGATE</span>',
		time: '<span class="wm-topic-badge time">TIME</span>',
		ratio: '<span class="wm-topic-badge ratio">RATIO</span>',
	};
	return map[t] || '';
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

const formatCount = (n?: number): string => {
	if (n == null) return '—';
	if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
	if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
	return String(n);
};

export const renderModelPage = (store: Store) => {
	const topics = store.state.topics;
	const domains = [...new Set(topics.map(t => t.domain).filter(Boolean))];

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Modeling</div>
			<div class="wm-page-hero-desc">Define Watchmen topics, factor structures, and semantic models</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${topics.length}</div>
					<div class="wm-hero-kpi-label">Topics</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${topics.reduce((sum, t) => sum + t.factors.length, 0)}</div>
					<div class="wm-hero-kpi-label">Factors</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${domains.length}</div>
					<div class="wm-hero-kpi-label">Domains</div>
				</div>
				<div class="wm-hero-kpi blue">
					<div class="wm-hero-kpi-val">${topics.filter(t => t.kind === 'business').length}</div>
					<div class="wm-hero-kpi-label">Business</div>
				</div>
			</div>
		</div>

		${domains.map(domain => {
			const domainTopics = topics.filter(t => t.domain === domain);
			return `
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">${domain!.charAt(0).toUpperCase() + domain!.slice(1)}</div>
					<div class="wm-section-hint">${domainTopics.length} topics</div>
				</div>
				<div class="wm-topic-grid">
					${domainTopics.map(topic => `
					<div class="wm-topic-card ${topic.healthStatus === 'error' ? 'border-error' : topic.healthStatus === 'warning' ? 'border-warning' : ''}">
						<div class="wm-topic-card-top">
							<div class="wm-topic-name">${topic.name}</div>
							<div class="wm-topic-badges">
								${topicTypeBadge(topic.type)}
								<span class="wm-topic-badge ${topic.kind}">${topic.kind.toUpperCase()}</span>
							</div>
						</div>
						${topic.description ? `<div class="wm-topic-desc">${topic.description}</div>` : ''}
						<div class="wm-topic-stats">
							<div class="wm-topic-stat">
								<span class="wm-topic-stat-val">${topic.factors.length}</span>
								<span class="wm-topic-stat-label">Factors</span>
							</div>
							<div class="wm-topic-stat">
								<span class="wm-topic-stat-val">${formatCount(topic.recordCount)}</span>
								<span class="wm-topic-stat-label">Records</span>
							</div>
							<div class="wm-topic-stat">
								<span class="wm-topic-stat-val">${healthLabel(topic.healthStatus)}</span>
								<span class="wm-topic-stat-label">Health</span>
							</div>
						</div>
						<div class="wm-topic-factors">
							${topic.factors.slice(0, 5).map(f => `
								<span class="wm-factor-chip">
									<span class="wm-factor-name">${f.label || f.name}</span>
									<span class="wm-factor-type">${f.type}</span>
								</span>
							`).join('')}
							${topic.factors.length > 5 ? `<span class="wm-factor-more">+${topic.factors.length - 5} more</span>` : ''}
						</div>
					</div>
					`).join('')}
				</div>
			</div>`;
		}).join('')}
	</div>`;
};