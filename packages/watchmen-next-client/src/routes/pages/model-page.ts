import { Store } from "../../state/store";
import { topicTypeBadge, healthLabel, formatCount } from "../../utils/display";
import { getTopicStats, getTopicDomainList, getTopicsByDomain } from "../../services";

export const renderModelPage = (store: Store) => {
	const topics = store.state.topics;
	const stats = getTopicStats(topics);
	const domains = getTopicDomainList(topics);

	return `
	<div class="wm-page">
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Data Modeling</div>
			<div class="wm-page-hero-desc">Define Watchmen topics, factor structures, and semantic models</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.total}</div>
					<div class="wm-hero-kpi-label">Topics</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.totalFactors}</div>
					<div class="wm-hero-kpi-label">Factors</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.domainCount}</div>
					<div class="wm-hero-kpi-label">Domains</div>
				</div>
				<div class="wm-hero-kpi blue">
					<div class="wm-hero-kpi-val">${stats.businessCount}</div>
					<div class="wm-hero-kpi-label">Business</div>
				</div>
			</div>
		</div>

		${domains
			.map((domain) => {
				const domainTopics = getTopicsByDomain(topics, domain);
				return `
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">${domain!.charAt(0).toUpperCase() + domain!.slice(1)}</div>
					<div class="wm-section-hint">${domainTopics.length} topics</div>
				</div>
				<div class="wm-topic-grid">
					${domainTopics
						.map(
							(topic) => `
					<div class="wm-topic-card ${topic.healthStatus === "error" ? "border-error" : topic.healthStatus === "warning" ? "border-warning" : ""}">
						<div class="wm-topic-card-top">
							<div class="wm-topic-name">${topic.name}</div>
							<div class="wm-topic-badges">
								${topicTypeBadge(topic.type)}
								<span class="wm-topic-badge ${topic.kind}">${topic.kind.toUpperCase()}</span>
							</div>
						</div>
						${topic.description ? `<div class="wm-topic-desc">${topic.description}</div>` : ""}
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
							${topic.factors
								.slice(0, 5)
								.map(
									(f) => `
								<span class="wm-factor-chip">
									<span class="wm-factor-name">${f.label || f.name}</span>
									<span class="wm-factor-type">${f.type}</span>
								</span>
							`,
								)
								.join("")}
							${topic.factors.length > 5 ? `<span class="wm-factor-more">+${topic.factors.length - 5} more</span>` : ""}
						</div>
					</div>
					`,
						)
						.join("")}
				</div>
			</div>`;
			})
			.join("")}
	</div>`;
};
