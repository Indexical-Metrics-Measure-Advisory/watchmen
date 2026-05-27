import { Store } from "../../state/store";
import { ObservabilityNode } from "../../types";

const STAGE_LABELS: Record<string, string> = {
	ingest: "Ingest",
	raw: "Raw",
	pipeline: "Pipeline",
	topic: "Topic",
	semantic: "Semantic",
	metric: "Metric",
	consumption: "Consumption",
};

const STAGE_ICONS: Record<string, string> = {
	ingest: "⬡",
	raw: "◈",
	pipeline: "⟳",
	topic: "◫",
	semantic: "◇",
	metric: "◉",
	consumption: "▦",
};

const HEALTH_CLASS: Record<string, string> = {
	healthy: "healthy",
	warning: "warning",
	error: "error",
	unknown: "unknown",
};

const TAB_ICONS: Record<string, string> = {
	overview: "◉",
	catalog: "◫",
	graph: "◈",
	impact: "⚡",
	events: "⏱",
};

const PORTFOLIO_SCALE = [
	{ label: "Topics", value: "2,486", sub: "183 raw · 2,303 curated", pct: 82, stage: "topic" },
	{ label: "Pipelines", value: "312", sub: "41 critical flows under active monitoring", pct: 65, stage: "pipeline" },
	{ label: "Semantic Models", value: "239", sub: "Mapped to 997 business factors", pct: 58, stage: "semantic" },
	{ label: "Metrics", value: "739", sub: "164 derived or ratio metrics", pct: 71, stage: "metric" },
	{
		label: "Consumption Assets",
		value: "160",
		sub: "Dashboards, alerts and subscriptions",
		pct: 45,
		stage: "consumption",
	},
];

const DOMAIN_HEALTH = [
	{
		name: "Commerce",
		scope: "842 topics · 96 pipelines",
		health: "warning",
		summary: "Freshness pressure on raw ingest and two blocked sync pipelines.",
		score: 72,
	},
	{
		name: "Finance",
		scope: "611 topics · 74 pipelines",
		health: "healthy",
		summary: "Mostly stable, but 14 semantic mappings need cleanup.",
		score: 91,
	},
	{
		name: "Risk",
		scope: "392 topics · 48 pipelines",
		health: "error",
		summary: "Several derived metrics are impacted by partial lineage resolution.",
		score: 38,
	},
	{
		name: "Customer",
		scope: "641 topics · 57 pipelines",
		health: "healthy",
		summary: "Healthy portfolio with one delayed low-priority source.",
		score: 88,
	},
];

const CATALOG_ROWS = [
	{
		id: "catalog-1",
		name: "commerce / raw topics",
		stage: "raw",
		owner: "commerce-data",
		count: 842,
		health: "warning",
		actionNodeId: "topic-sales-order-raw",
		domain: "commerce",
	},
	{
		id: "catalog-2",
		name: "finance / curated topics",
		stage: "topic",
		owner: "finance-warehouse",
		count: 611,
		health: "healthy",
		actionNodeId: "topic-sales-order-standard",
		domain: "finance",
	},
	{
		id: "catalog-3",
		name: "risk / business metrics",
		stage: "metric",
		owner: "risk-analytics",
		count: 146,
		health: "error",
		actionNodeId: "metric-order-risk-score",
		domain: "risk",
	},
	{
		id: "catalog-4",
		name: "commerce / transform pipelines",
		stage: "pipeline",
		owner: "commerce-platform",
		count: 96,
		health: "error",
		actionNodeId: "pipeline-sync-sales-order",
		domain: "commerce",
	},
	{
		id: "catalog-5",
		name: "finance / semantic models",
		stage: "semantic",
		owner: "finance-ops",
		count: 58,
		health: "warning",
		actionNodeId: "semantic-orders-finance",
		domain: "finance",
	},
	{
		id: "catalog-6",
		name: "executive / dashboard assets",
		stage: "consumption",
		owner: "executive-bi",
		count: 34,
		health: "warning",
		actionNodeId: "chart-gmv-dashboard",
		domain: "finance",
	},
	{
		id: "catalog-7",
		name: "commerce / ingest sources",
		stage: "ingest",
		owner: "commerce-platform",
		count: 38,
		health: "healthy",
		actionNodeId: "source-mysql-sales",
		domain: "commerce",
	},
	{
		id: "catalog-8",
		name: "risk / raw topics",
		stage: "raw",
		owner: "risk-ops",
		count: 183,
		health: "warning",
		actionNodeId: "topic-sales-order-raw",
		domain: "risk",
	},
	{
		id: "catalog-9",
		name: "customer / pipelines",
		stage: "pipeline",
		owner: "customer-data",
		count: 72,
		health: "healthy",
		actionNodeId: "pipeline-sync-sales-order",
		domain: "customer",
	},
	{
		id: "catalog-10",
		name: "commerce / business metrics",
		stage: "metric",
		owner: "commerce-analytics",
		count: 221,
		health: "warning",
		actionNodeId: "metric-total-gmv",
		domain: "commerce",
	},
	{
		id: "catalog-11",
		name: "finance / raw ingest",
		stage: "ingest",
		owner: "finance-warehouse",
		count: 24,
		health: "healthy",
		actionNodeId: "source-mysql-sales",
		domain: "finance",
	},
	{
		id: "catalog-12",
		name: "risk / consumption dashboards",
		stage: "consumption",
		owner: "risk-bi",
		count: 28,
		health: "error",
		actionNodeId: "chart-gmv-dashboard",
		domain: "risk",
	},
	{
		id: "catalog-13",
		name: "customer / semantic models",
		stage: "semantic",
		owner: "customer-data",
		count: 94,
		health: "healthy",
		actionNodeId: "semantic-orders-finance",
		domain: "customer",
	},
	{
		id: "catalog-14",
		name: "commerce / curated topics",
		stage: "topic",
		owner: "commerce-data",
		count: 412,
		health: "healthy",
		actionNodeId: "topic-sales-order-standard",
		domain: "commerce",
	},
];

const STAGE_ORDER = ["ingest", "raw", "pipeline", "topic", "semantic", "metric", "consumption"];

const ALL_STAGES = ["", ...STAGE_ORDER];
const ALL_HEALTH = ["", "healthy", "warning", "error"];
const ALL_DOMAINS = ["", "commerce", "finance", "risk", "customer"];
const ALL_SEVERITY = ["", "critical", "warning", "info"];
const ALL_EVENT_TYPE = ["", "pipeline_failure", "freshness_breach", "metric_partial_lineage"];

const getNeighborIds = (store: Store, focusNodeId: string, depth: number): Set<string> => {
	const visited = new Set<string>([focusNodeId]);
	let frontier = new Set<string>([focusNodeId]);
	for (let level = 0; level < depth; level += 1) {
		const nextFrontier = new Set<string>();
		store.state.observabilityEdges.forEach((edge) => {
			if (frontier.has(edge.from) && !visited.has(edge.to)) {
				visited.add(edge.to);
				nextFrontier.add(edge.to);
			}
			if (frontier.has(edge.to) && !visited.has(edge.from)) {
				visited.add(edge.from);
				nextFrontier.add(edge.from);
			}
		});
		frontier = nextFrontier;
	}
	return visited;
};

const nodesByStageAndDomain = (store: Store, stage: string): Record<string, ObservabilityNode[]> => {
	const groups: Record<string, ObservabilityNode[]> = {};
	store.state.observabilityNodes.forEach((n) => {
		if (n.stage !== stage) return;
		const domain = n.metadata?.domain || "unknown";
		(groups[domain] ||= []).push(n);
	});
	return groups;
};

const stageNodeCounts = (
	store: Store,
	stage: string,
): { healthy: number; warning: number; error: number; total: number } => {
	const h = store.state.observabilityStageHealth.find((s) => s.stage === stage);
	return {
		healthy: h?.healthy || 0,
		warning: h?.warning || 0,
		error: h?.error || 0,
		total: (h?.healthy || 0) + (h?.warning || 0) + (h?.error || 0),
	};
};

const renderHealthBar = (healthy: number, warning: number, error: number) => {
	const total = healthy + warning + error;
	if (total === 0) return "";
	const hPct = ((healthy / total) * 100).toFixed(1);
	const wPct = ((warning / total) * 100).toFixed(1);
	const ePct = ((error / total) * 100).toFixed(1);
	return `
		<div class="wm-health-bar">
			<div class="wm-health-bar-fill healthy" style="width:${hPct}%"></div>
			<div class="wm-health-bar-fill warning" style="width:${wPct}%"></div>
			<div class="wm-health-bar-fill error" style="width:${ePct}%"></div>
		</div>
	`;
};

const renderPagination = (page: number, total: number, pageSize: number, prefix: string) => {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	if (totalPages <= 1) return "";
	const pages: number[] = [];
	for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
		pages.push(i);
	}
	return `
		<div class="wm-pagination">
			<span class="wm-pagination-info">${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}</span>
			<div class="wm-pagination-btns">
				<button class="wm-pagination-btn" data-${prefix}-page="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""}>‹</button>
				${pages
					.map(
						(p) => `
					<button class="wm-pagination-btn${p === page ? " active" : ""}" data-${prefix}-page="${p}">${p}</button>
				`,
					)
					.join("")}
				<button class="wm-pagination-btn" data-${prefix}-page="${Math.min(totalPages, page + 1)}" ${page >= totalPages ? "disabled" : ""}>›</button>
			</div>
		</div>
	`;
};

// ===== HERO + TABS =====

const renderObserveHero = (store: Store) => {
	const total = store.state.observabilityKpis.find((k) => k.label === "Total Assets")?.value || "—";
	const healthy = store.state.observabilityKpis.find((k) => k.label === "Healthy")?.value || "—";
	const warnings = store.state.observabilityKpis.find((k) => k.label === "Warnings")?.value || "—";
	const errors = store.state.observabilityKpis.find((k) => k.label === "Errors")?.value || "—";
	return `
	<div class="wm-observe-hero">
		<div class="wm-observe-hero-bg"></div>
		<div class="wm-observe-hero-content">
			<div class="wm-observe-hero-left">
				<div class="wm-observe-title">Global Data Observability</div>
				<div class="wm-observe-subtitle">Trace data from ingest to raw topic, pipeline, semantic layer and metric consumption. ${total} assets across 7 stages.</div>
			</div>
			<div class="wm-observe-hero-actions">
				<div class="wm-observe-global-search-box">
					<span class="wm-observe-search-icon">⌕</span>
					<input
						class="wm-observe-global-search-input"
						type="text"
						placeholder="Search any asset, topic, pipeline or metric..."
						value="${escapeHtml(store.state.observabilityGlobalSearch)}"
						data-observe-global-search
					/>
					${store.state.observabilityGlobalSearch ? `<button class="wm-observe-search-clear" data-observe-global-search-clear title="Clear">×</button>` : ""}
				</div>
			</div>
		</div>
		<div class="wm-observe-hero-strip">
			<div class="wm-observe-strip-item">
				<span class="wm-observe-strip-dot blue"></span>
				<span class="wm-observe-strip-value">${total}</span>
				<span class="wm-observe-strip-label">Total Assets</span>
			</div>
			<div class="wm-observe-strip-divider"></div>
			<div class="wm-observe-strip-item">
				<span class="wm-observe-strip-dot green"></span>
				<span class="wm-observe-strip-value">${healthy}</span>
				<span class="wm-observe-strip-label">Healthy</span>
			</div>
			<div class="wm-observe-strip-divider"></div>
			<div class="wm-observe-strip-item">
				<span class="wm-observe-strip-dot orange"></span>
				<span class="wm-observe-strip-value">${warnings}</span>
				<span class="wm-observe-strip-label">Warnings</span>
			</div>
			<div class="wm-observe-strip-divider"></div>
			<div class="wm-observe-strip-item">
				<span class="wm-observe-strip-dot red"></span>
				<span class="wm-observe-strip-value">${errors}</span>
				<span class="wm-observe-strip-label">Errors</span>
			</div>
		</div>
	</div>
`;
};

const renderObserveTabs = (store: Store) => {
	const tabs = [
		{ key: "overview", label: "Overview" },
		{ key: "catalog", label: "Asset Catalog" },
		{ key: "graph", label: "Graph Explorer" },
		{ key: "impact", label: "Impact Analysis" },
		{ key: "events", label: "Events & Health" },
	];
	return `
		<div class="wm-observe-tabs">
			${tabs
				.map(
					(tab) => `
				<button class="wm-observe-tab${store.state.observabilityView === tab.key ? " active" : ""}" data-observe-view="${tab.key}">
					<span class="wm-observe-tab-icon">${TAB_ICONS[tab.key]}</span>
					${tab.label}
				</button>
			`,
				)
				.join("")}
		</div>
	`;
};

// ===== OVERVIEW =====

const renderOverview = (store: Store) => `
	<div class="wm-observe-overview">
		<div class="wm-observe-kpis">
			${store.state.observabilityKpis
				.map(
					(kpi) => `
				<div class="wm-kpi-card ${kpi.tone}">
					<div class="wm-kpi-label">${kpi.label}</div>
					<div class="wm-kpi-value">${kpi.value}</div>
					<div class="wm-kpi-sub">${kpi.sub}</div>
				</div>
			`,
				)
				.join("")}
		</div>
		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Portfolio Scale</div>
				<div class="wm-section-hint">Click to filter catalog</div>
			</div>
			<div class="wm-observe-scale-grid">
				${PORTFOLIO_SCALE.map(
					(item) => `
					<button class="wm-observe-scale-card" data-observe-view="catalog" data-observe-catalog-filter="stage" data-observe-catalog-filter-value="${item.stage}">
						<div class="wm-observe-scale-top">
							<div class="wm-observe-scale-value">${item.value}</div>
							<div class="wm-observe-scale-pct">${item.pct}%</div>
						</div>
						<div class="wm-observe-scale-bar-track">
							<div class="wm-observe-scale-bar-fill" style="width:${item.pct}%"></div>
						</div>
						<div class="wm-observe-scale-label">${item.label}</div>
						<div class="wm-observe-scale-sub">${item.sub}</div>
					</button>
				`,
				).join("")}
			</div>
		</div>
		<div class="wm-observe-grid">
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Health By Stage</div>
					<div class="wm-section-hint">Click stage to drill down</div>
				</div>
				<div class="wm-observe-stage-list">
					${store.state.observabilityStageHealth
						.map((item) => {
							return `
						<button class="wm-observe-stage-row" data-observe-graph-zoom-stage="${item.stage}" data-observe-view="graph">
							<div class="wm-observe-stage-left">
								<span class="wm-observe-stage-icon">${STAGE_ICONS[item.stage]}</span>
								<span class="wm-observe-stage-name">${STAGE_LABELS[item.stage]}</span>
							</div>
							<div class="wm-observe-stage-center">
								${renderHealthBar(item.healthy, item.warning, item.error)}
							</div>
							<div class="wm-observe-stage-right">
								<span class="wm-health-pill healthy">${item.healthy}</span>
								<span class="wm-health-pill warning">${item.warning}</span>
								<span class="wm-health-pill error">${item.error}</span>
							</div>
						</button>
					`;
						})
						.join("")}
				</div>
			</div>
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Recent Critical Events</div>
					<button class="wm-btn wm-btn-ghost wm-btn-sm" data-observe-view="events">View All</button>
				</div>
				<div class="wm-observe-event-cards">
					${store.state.observabilityEvents
						.slice(0, 3)
						.map(
							(event) => `
						<button class="wm-observe-event-card ${event.healthStatus}" data-observe-select-node="${event.targetId}">
							<div class="wm-observe-event-top">
								<span class="wm-observe-severity-indicator ${event.healthStatus}">
									<span class="wm-observe-severity-dot"></span>
									${event.severity.toUpperCase()}
								</span>
								<span class="wm-observe-event-time">${event.timestamp}</span>
							</div>
							<div class="wm-observe-event-target">${event.targetLabel}</div>
							<div class="wm-observe-event-message">${event.message}</div>
							${
								event.impactedMetrics.length > 0
									? `
								<div class="wm-observe-event-impacts">
									${event.impactedMetrics.map((m) => `<span class="wm-observe-impact-tag">${m}</span>`).join("")}
								</div>
							`
									: ""
							}
						</button>
					`,
						)
						.join("")}
				</div>
			</div>
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Domain Health</div>
				</div>
				<div class="wm-observe-domain-list">
					${DOMAIN_HEALTH.map(
						(item) => `
						<div class="wm-observe-domain-row ${item.health}">
							<div class="wm-observe-domain-info">
								<div class="wm-observe-domain-top">
									<span class="wm-observe-impact-name">${item.name}</span>
									<span class="wm-health-pill ${item.health}">${item.health}</span>
								</div>
								<div class="wm-observe-impact-path">${item.scope}</div>
								<div class="wm-observe-event-message">${item.summary}</div>
							</div>
							<div class="wm-observe-domain-score-ring ${item.health}">
								<svg viewBox="0 0 36 36">
									<path class="wm-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
									<path class="wm-ring-fill" stroke-dasharray="${item.score}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
								</svg>
								<span class="wm-observe-domain-score-value">${item.score}</span>
							</div>
						</div>
					`,
					).join("")}
				</div>
			</div>
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Top Impacted Assets</div>
				</div>
				<div class="wm-observe-impact-list">
					${store.state.observabilityImpact
						.map(
							(item) => `
						<div class="wm-observe-impact-row">
							<div class="wm-observe-impact-info">
								<div class="wm-observe-impact-name">${item.name}</div>
								<div class="wm-observe-impact-path">
									${item.shortestPath.map((seg, i) => `<span class="wm-observe-path-seg">${seg}</span>${i < item.shortestPath.length - 1 ? '<span class="wm-observe-path-arrow">→</span>' : ""}`).join("")}
								</div>
							</div>
							<div class="wm-observe-impact-tags">
								<span class="wm-health-pill ${item.healthStatus}">${item.healthStatus}</span>
								<span class="wm-observe-node-badge">${item.type}</span>
							</div>
						</div>
					`,
						)
						.join("")}
				</div>
			</div>
		</div>
	</div>
`;

// ===== CATALOG =====

const filterCatalogRows = (store: Store) => {
	const f = store.state.observabilityCatalogFilter;
	let rows = [...CATALOG_ROWS];
	if (f.search) {
		const q = f.search.toLowerCase();
		rows = rows.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				r.owner.toLowerCase().includes(q) ||
				r.domain.toLowerCase().includes(q),
		);
	}
	if (f.stage) rows = rows.filter((r) => r.stage === f.stage);
	if (f.health) rows = rows.filter((r) => r.health === f.health);
	if (f.domain) rows = rows.filter((r) => r.domain === f.domain);
	if (f.sort === "count") rows.sort((a, b) => b.count - a.count);
	else if (f.sort === "health") {
		const order: Record<string, number> = { error: 0, warning: 1, healthy: 2 };
		rows.sort((a, b) => (order[a.health] ?? 3) - (order[b.health] ?? 3));
	} else {
		rows.sort((a, b) => a.name.localeCompare(b.name));
	}
	return rows;
};

const renderFilterPills = (prefix: string, options: string[], current: string, labelMap?: Record<string, string>) => `
	<div class="wm-filter-pills">
		${options
			.map((opt) => {
				const label = labelMap?.[opt] || (opt === "" ? "All" : opt);
				const active = opt === current;
				return `
				<button class="wm-filter-pill${active ? " active" : ""}" data-${prefix}="${opt}" data-${prefix}-value="${opt}">
					${label}
				</button>
			`;
			})
			.join("")}
	</div>
`;

const renderCatalog = (store: Store) => {
	const f = store.state.observabilityCatalogFilter;
	const filtered = filterCatalogRows(store);
	const total = filtered.length;
	const pageSize = f.pageSize;
	const start = (f.page - 1) * pageSize;
	const page = filtered.slice(start, start + pageSize);

	const stageLabelMap: Record<string, string> = {};
	STAGE_ORDER.forEach((s) => {
		stageLabelMap[s] = STAGE_LABELS[s];
	});

	return `
	<div class="wm-observe-catalog-page">
		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Asset Catalog</div>
				<div class="wm-section-hint">${total} asset group${total !== 1 ? "s" : ""} found</div>
			</div>
			<div class="wm-observe-catalog-controls">
				<div class="wm-observe-search-box">
					<span class="wm-observe-search-icon">⌕</span>
					<input
						class="wm-observe-search-input"
						type="text"
						placeholder="Search by asset name, owner or domain..."
						value="${escapeHtml(f.search)}"
						data-observe-catalog-search
					/>
				</div>
				<div class="wm-observe-catalog-filters-top">
					<div class="wm-observe-filter-group">
						<span class="wm-observe-filter-label">Stage</span>
						${renderFilterPills("observe-catalog-filter", ALL_STAGES, f.stage, stageLabelMap)}
					</div>
					<div class="wm-observe-filter-group">
						<span class="wm-observe-filter-label">Health</span>
						${renderFilterPills("observe-catalog-filter", ALL_HEALTH, f.health)}
					</div>
					<div class="wm-observe-filter-group">
						<span class="wm-observe-filter-label">Domain</span>
						${renderFilterPills("observe-catalog-filter", ALL_DOMAINS, f.domain)}
					</div>
				</div>
				<div class="wm-observe-catalog-toolbar">
					<div class="wm-observe-sort-group">
						<span class="wm-observe-filter-label">Sort</span>
						<button class="wm-filter-pill${f.sort === "name" ? " active" : ""}" data-observe-catalog-sort="name">Name</button>
						<button class="wm-filter-pill${f.sort === "count" ? " active" : ""}" data-observe-catalog-sort="count">Count</button>
						<button class="wm-filter-pill${f.sort === "health" ? " active" : ""}" data-observe-catalog-sort="health">Health</button>
					</div>
				</div>
			</div>
			<div class="wm-observe-catalog-table">
				<div class="wm-observe-catalog-head">
					<span>Asset Group</span>
					<span>Stage</span>
					<span>Owner</span>
					<span>Count</span>
					<span>Health</span>
					<span>Action</span>
				</div>
				${page
					.map(
						(row) => `
					<div class="wm-observe-catalog-row">
						<span class="wm-observe-catalog-name">
							<span class="wm-observe-catalog-stage-dot ${row.health}"></span>
							${highlightMatch(row.name, f.search)}
						</span>
						<span><span class="wm-observe-node-badge">${STAGE_LABELS[row.stage] || row.stage}</span></span>
						<span>${highlightMatch(row.owner, f.search)}</span>
						<span class="wm-observe-catalog-count">${row.count.toLocaleString()}</span>
						<span><span class="wm-health-pill ${row.health}">${row.health}</span></span>
						<span>
							<button class="wm-btn wm-btn-ghost wm-observe-inline-btn" data-observe-select-node="${row.actionNodeId}" data-observe-view="graph">
								Open Cluster
							</button>
						</span>
					</div>
				`,
					)
					.join("")}
				${page.length === 0 ? `<div class="wm-observe-empty">No asset groups match your filters.</div>` : ""}
			</div>
			${renderPagination(f.page, total, pageSize, "observe-catalog")}
		</div>
	</div>
`;
};

// ===== GRAPH EXPLORER =====

const renderGraphBreadcrumb = (store: Store) => {
	const zoom = store.state.observabilityGraphZoom;
	const domain = store.state.observabilityGraphDomain;
	const crumbs = [{ label: "Graph", zoom: "stage" }];
	if (zoom === "domain" || zoom === "node") {
		crumbs.push({ label: STAGE_LABELS[domain] || domain, zoom: "stage" });
	}
	if (zoom === "node") {
		crumbs.push({ label: domain, zoom: "domain" });
	}
	return `
		<div class="wm-graph-breadcrumb">
			${crumbs
				.map(
					(c, i) => `
				${i > 0 ? '<span class="wm-graph-breadcrumb-sep">/</span>' : ""}
				<button class="wm-graph-breadcrumb-item${i === crumbs.length - 1 ? " active" : ""}" data-observe-graph-zoom-out="${c.zoom}">
					${c.label}
				</button>
			`,
				)
				.join("")}
		</div>
	`;
};

const renderGraphZoomStageView = (store: Store) => `
	<div class="wm-observe-cluster-strip">
		${store.state.observabilityStageHealth
			.map((item) => {
				const total = item.healthy + item.warning + item.error;
				return `
				<button class="wm-observe-cluster-card wm-observe-cluster-card-clickable" data-observe-graph-zoom-stage="${item.stage}" data-observe-view="graph">
					<div class="wm-observe-cluster-top">
						<span class="wm-observe-cluster-icon">${STAGE_ICONS[item.stage]}</span>
						<div class="wm-observe-cluster-stage">${STAGE_LABELS[item.stage]}</div>
					</div>
					<div class="wm-observe-cluster-count">${total.toLocaleString()}</div>
					${renderHealthBar(item.healthy, item.warning, item.error)}
					<div class="wm-observe-cluster-pills">
						<span class="wm-health-pill healthy">${item.healthy}</span>
						<span class="wm-health-pill warning">${item.warning}</span>
						<span class="wm-health-pill error">${item.error}</span>
					</div>
					<div class="wm-observe-cluster-hint">Click to see domains →</div>
				</button>
			`;
			})
			.join("")}
	</div>
`;

const renderGraphZoomDomainView = (store: Store) => {
	const stage = store.state.observabilityGraphDomain;
	const domainGroups = nodesByStageAndDomain(store, stage);
	const counts = stageNodeCounts(store, stage);
	const domains = Object.keys(domainGroups).sort();
	return `
		<div class="wm-observe-zoom-panel">
			<div class="wm-observe-zoom-summary">
				<div class="wm-observe-zoom-stage-badge">
					<span class="wm-observe-stage-icon">${STAGE_ICONS[stage]}</span>
					<span>${STAGE_LABELS[stage]}</span>
					<span class="wm-observe-zoom-total">${counts.total} nodes across ${domains.length} domains</span>
				</div>
				${renderHealthBar(counts.healthy, counts.warning, counts.error)}
			</div>
			<div class="wm-observe-domain-grid">
				${domains
					.map((domain) => {
						const nodes = domainGroups[domain];
						const h = nodes.filter((n) => n.healthStatus === "healthy").length;
						const w = nodes.filter((n) => n.healthStatus === "warning").length;
						const e = nodes.filter((n) => n.healthStatus === "error").length;
						const worstHealth = e > 0 ? "error" : w > 0 ? "warning" : "healthy";
						return `
						<button class="wm-observe-domain-card ${worstHealth}" data-observe-graph-zoom-domain="${domain}" data-observe-view="graph">
							<div class="wm-observe-domain-card-top">
								<span class="wm-observe-domain-card-name">${domain}</span>
								<span class="wm-health-pill ${worstHealth}">${worstHealth}</span>
							</div>
							<div class="wm-observe-domain-card-count">${nodes.length} assets</div>
							${renderHealthBar(h, w, e)}
							<div class="wm-observe-domain-card-pills">
								<span class="wm-health-pill healthy">${h} healthy</span>
								<span class="wm-health-pill warning">${w} warning</span>
								<span class="wm-health-pill error">${e} error</span>
							</div>
							<div class="wm-observe-domain-card-types">
								${[...new Set(nodes.map((n) => n.type))]
									.slice(0, 3)
									.map((t) => `<span class="wm-observe-node-badge">${t.replace(/_/g, " ")}</span>`)
									.join("")}
							</div>
						</button>
					`;
					})
					.join("")}
			</div>
		</div>
	`;
};

const renderGraphZoomNodeView = (store: Store) => {
	const selectedNode =
		store.state.observabilityNodes.find((node) => node.id === store.state.observabilitySelectedNodeId) ||
		store.state.observabilityNodes[0];
	const adjacentEdges = store.state.observabilityEdges.filter(
		(edge) => edge.from === selectedNode.id || edge.to === selectedNode.id,
	);
	const focusedIds = getNeighborIds(store, selectedNode.id, 2);
	const focusedNodes = store.state.observabilityNodes.filter((node) => focusedIds.has(node.id));
	return `
		<div class="wm-observe-graph-shell">
			<div>
				<div class="wm-section-card">
					<div class="wm-observe-graph-board wm-observe-graph-focused">
						${STAGE_ORDER.map((s) => {
							const nodes = focusedNodes.filter((node) => node.stage === s);
							return `
								<div class="wm-observe-stage-column">
									<div class="wm-observe-stage-column-title">
										<span class="wm-observe-stage-icon">${STAGE_ICONS[s]}</span>
										${STAGE_LABELS[s]}
									</div>
									<div class="wm-observe-stage-column-body">
										${nodes.length === 0 ? `<div class="wm-observe-empty-cluster">No expanded assets</div>` : ""}
										${nodes
											.map(
												(node) => `
											<button
												class="wm-observe-node-card ${HEALTH_CLASS[node.healthStatus]}${store.state.observabilitySelectedNodeId === node.id ? " selected" : ""}"
												data-observe-select-node="${node.id}">
												<div class="wm-observe-node-health-indicator ${node.healthStatus}"></div>
												<div class="wm-observe-node-body">
													<div class="wm-observe-node-name">${node.label || node.name}</div>
													<div class="wm-observe-node-type">${node.type.replace(/_/g, " ")}</div>
													<div class="wm-observe-node-badges">
														${(node.badges || [])
															.slice(0, 2)
															.map(
																(badge) =>
																	`<span class="wm-observe-node-badge">${badge}</span>`,
															)
															.join("")}
													</div>
												</div>
											</button>
										`,
											)
											.join("")}
									</div>
								</div>
							`;
						}).join("")}
					</div>
				</div>
			</div>
			<div class="wm-observe-graph-detail">
				<div class="wm-section-card">
					<div class="wm-section-header">
						<div class="wm-section-title">Node Detail</div>
					</div>
					<div class="wm-observe-detail-body">
						<div class="wm-observe-detail-name">${selectedNode.label || selectedNode.name}</div>
						<div class="wm-observe-detail-type">${selectedNode.type.replace(/_/g, " ")} · ${STAGE_LABELS[selectedNode.stage]}</div>
						<div class="wm-health-pill ${selectedNode.healthStatus}">${selectedNode.healthStatus}</div>
						<div class="wm-observe-detail-desc">${selectedNode.description || "No description available."}</div>
						<div class="wm-observe-metadata">
							${Object.entries(selectedNode.metadata || {})
								.map(
									([key, value]) => `
								<div class="wm-observe-meta-row">
									<div class="wm-observe-meta-key">${key}</div>
									<div class="wm-observe-meta-value">${String(value)}</div>
								</div>
							`,
								)
								.join("")}
						</div>
						<div class="wm-observe-related">
							<div class="wm-detail-subtitle">Adjacent Relations</div>
							${adjacentEdges
								.map(
									(edge) => `
								<div class="wm-observe-related-row">
									<span>${edge.relation}</span>
									<span>${edge.from === selectedNode.id ? edge.to : edge.from}</span>
								</div>
							`,
								)
								.join("")}
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
};

const renderGraph = (store: Store) => {
	const zoom = store.state.observabilityGraphZoom;

	let body = renderGraphZoomStageView(store);
	if (zoom === "domain") body = renderGraphZoomDomainView(store);
	else if (zoom === "node") body = renderGraphZoomNodeView(store);

	return `
		<div class="wm-observe-graph-page">
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Graph Explorer</div>
					<div class="wm-section-hint">Drill down: Stage → Domain → Node</div>
				</div>
				${renderGraphBreadcrumb(store)}
				${body}
			</div>
		</div>
	`;
};

// ===== IMPACT ANALYSIS =====

const renderImpact = (store: Store) => `
	<div class="wm-observe-impact-page">
		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Impact Summary</div>
			</div>
			<div class="wm-observe-impact-summary">
				<div class="wm-observe-impact-highlight">
					<div class="wm-observe-highlight-label">Focus Node</div>
					<div class="wm-observe-highlight-value">
						${store.state.observabilityNodes.find((node) => node.id === store.state.observabilityFocusNodeId)?.label || store.state.observabilityFocusNodeId}
					</div>
				</div>
				<div class="wm-observe-impact-stats">
					<div class="wm-observe-impact-stat"><strong>${store.state.observabilityImpact.filter((item) => item.type === "metric").length}</strong><span>Metrics</span></div>
					<div class="wm-observe-impact-stat"><strong>${store.state.observabilityImpact.filter((item) => item.type === "consumption").length}</strong><span>Consumption Assets</span></div>
					<div class="wm-observe-impact-stat"><strong>critical</strong><span>Highest Severity</span></div>
				</div>
			</div>
		</div>
		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Impacted Assets</div>
				<div class="wm-section-hint">${store.state.observabilityImpact.length} assets downstream</div>
			</div>
			<div class="wm-observe-impact-table">
				${store.state.observabilityImpact
					.map(
						(item) => `
					<div class="wm-observe-impact-item">
						<div>
							<div class="wm-observe-impact-name">${item.name}</div>
							<div class="wm-observe-impact-path">
								${item.shortestPath.map((seg, i) => `<span class="wm-observe-path-seg">${seg}</span>${i < item.shortestPath.length - 1 ? '<span class="wm-observe-path-arrow">→</span>' : ""}`).join("")}
							</div>
						</div>
						<div class="wm-observe-impact-tags">
							<span class="wm-health-pill ${item.healthStatus}">${item.healthStatus}</span>
							<span class="wm-observe-node-badge">${item.type}</span>
						</div>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	</div>
`;

// ===== EVENTS & HEALTH =====

const renderEvents = (store: Store) => {
	const f = store.state.observabilityEventFilter;
	let events = [...store.state.observabilityEvents];
	if (f.severity) events = events.filter((e) => e.severity === f.severity);
	if (f.eventType) events = events.filter((e) => e.eventType === f.eventType);
	const total = events.length;
	const pageSize = f.pageSize;
	const start = (f.page - 1) * pageSize;
	const page = events.slice(start, start + pageSize);

	return `
	<div class="wm-section-card">
		<div class="wm-section-header">
			<div class="wm-section-title">Events & Health</div>
			<div class="wm-section-hint">${total} event${total !== 1 ? "s" : ""} found</div>
		</div>
		<div class="wm-observe-event-filters">
			<div class="wm-observe-filter-group">
				<span class="wm-observe-filter-label">Severity</span>
				${renderFilterPills("observe-event-filter", ALL_SEVERITY, f.severity)}
			</div>
			<div class="wm-observe-filter-group">
				<span class="wm-observe-filter-label">Type</span>
				${renderFilterPills("observe-event-filter", ALL_EVENT_TYPE, f.eventType)}
			</div>
		</div>
		<div class="wm-observe-events-table">
			<div class="wm-observe-events-head">
				<span>Time</span>
				<span>Severity</span>
				<span>Type</span>
				<span>Target</span>
				<span>Impact</span>
			</div>
			${page
				.map(
					(event) => `
				<button class="wm-observe-events-row" data-observe-select-node="${event.targetId}">
					<span class="wm-observe-events-time">${event.timestamp}</span>
					<span><span class="wm-observe-severity-indicator ${event.healthStatus}"><span class="wm-observe-severity-dot"></span>${event.severity}</span></span>
					<span class="wm-observe-events-type">${event.eventType}</span>
					<span class="wm-observe-events-target">${event.targetLabel}</span>
					<span class="wm-observe-events-impact">${event.impactedMetrics.map((m) => `<span class="wm-observe-impact-tag">${m}</span>`).join("")}</span>
				</button>
			`,
				)
				.join("")}
			${page.length === 0 ? `<div class="wm-observe-empty">No events match your filters.</div>` : ""}
		</div>
		${renderPagination(f.page, total, pageSize, "observe-event")}
	</div>
`;
};

// ===== HELPERS =====

const escapeHtml = (str: string) =>
	str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const highlightMatch = (text: string, query: string) => {
	if (!query) return escapeHtml(text);
	const escaped = escapeHtml(text);
	const q = escapeHtml(query).replace(/\s+/g, "|");
	const regex = new RegExp(`(${q})`, "gi");
	return escaped.replace(regex, '<mark class="wm-search-highlight">$1</mark>');
};

// ===== PAGE RENDER =====

export const renderObservePage = (store: Store) => {
	let body = renderOverview(store);
	if (store.state.observabilityView === "catalog") {
		body = renderCatalog(store);
	} else if (store.state.observabilityView === "graph") {
		body = renderGraph(store);
	} else if (store.state.observabilityView === "impact") {
		body = renderImpact(store);
	} else if (store.state.observabilityView === "events") {
		body = renderEvents(store);
	}
	return `
		<div class="wm-observe-page">
			${renderObserveHero(store)}
			${renderObserveTabs(store)}
			${body}
		</div>
	`;
};
