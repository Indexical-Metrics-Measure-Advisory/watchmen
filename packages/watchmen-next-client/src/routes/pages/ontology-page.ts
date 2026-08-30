import { Store } from "../../state/store";
import { escapeHtml } from "../../utils/format";
import { formatCount, healthLabel, maskingStrategyLabel, topicTypeBadge } from "../../utils/display";
import {
	getOntologyStats,
	getOntologyDomainList,
	getTopicsWithoutObject,
	getObjectById,
	getLinksForObject,
	getTermsForObject,
	getAttributeGovernance,
	getObjectGovernanceScore,
	resolveMaskStrategy,
	maskValue,
} from "../../services";
import {
	GlossaryTerm,
	OntologyAttribute,
	OntologyLink,
	OntologyObject,
	OntologySensitivity,
	PerceiveScenario,
	Topic,
} from "../../models";

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Pending proposals that touch the given object — the reverse direction of the
// perceive -> ontology linkage.
const pendingProposalsForObject = (store: Store, objectId: string): PerceiveScenario[] => {
	return store.state.perceiveScenarios.filter(
		(s) => s.status === "pending" && (s.affectedObjectIds || []).includes(objectId),
	);
};

// Summary of governance assets involved in a proposal, e.g. "2 rules · 1 term".
const proposalAssetSummary = (proposal: PerceiveScenario): string => {
	const parts: string[] = [];
	const rules = proposal.relatedRuleIds?.length || 0;
	const policies = proposal.relatedPolicyIds?.length || 0;
	const terms = proposal.relatedTermIds?.length || 0;
	if (rules > 0) parts.push(`${rules} rule${rules > 1 ? "s" : ""}`);
	if (policies > 0) parts.push(`${policies} polic${policies > 1 ? "ies" : "y"}`);
	if (terms > 0) parts.push(`${terms} term${terms > 1 ? "s" : ""}`);
	return parts.join(" · ");
};

const sensitivityBadge = (s: OntologySensitivity): string => {
	return `<span class="wm-sensitivity-pill ${s}">${capitalize(s)}</span>`;
};

const objectMonogram = (object: OntologyObject): string => {
	return `<span class="wm-obj-icon ${object.color}">${escapeHtml(object.icon)}</span>`;
};

const termStatusBadge = (term: GlossaryTerm): string => {
	return `<span class="wm-term-status ${term.status}">${capitalize(term.status)}</span>`;
};

const objectCard = (store: Store, object: OntologyObject): string => {
	const links = getLinksForObject(store.state.ontologyLinks, object.id);
	const score = getObjectGovernanceScore(object, store.state.maskingPolicies);
	return `
		<button class="wm-obj-card clickable" data-ontology-select="${object.id}">
			<div class="wm-obj-card-top">
				${objectMonogram(object)}
				<div class="wm-obj-name-wrap">
					<div class="wm-obj-name">${escapeHtml(object.displayName)}</div>
					<div class="wm-obj-domain">${escapeHtml(object.domain)} · ${escapeHtml(object.name)}</div>
				</div>
				${sensitivityBadge(object.sensitivity)}
			</div>
			<div class="wm-obj-desc">${escapeHtml(object.description || "")}</div>
			<div class="wm-obj-stats">
				<span class="wm-obj-stat"><b>${object.attributes.length}</b> attrs</span>
				<span class="wm-obj-stat"><b>${object.derivedAttributes.length}</b> derived</span>
				<span class="wm-obj-stat"><b>${links.length}</b> links</span>
				<span class="wm-obj-stat"><b>${object.sourceTopicIds.length}</b> topics</span>
			</div>
			<div class="wm-obj-card-foot">
				${healthLabel(object.healthStatus)}
				<span class="wm-obj-score" title="Governance coverage score">⛨ ${score}</span>
			</div>
		</button>
	`;
};

const linkRow = (store: Store, link: OntologyLink): string => {
	const objects = store.state.ontologyObjects;
	const source = objects.find((o) => o.id === link.sourceObjectId);
	const target = objects.find((o) => o.id === link.targetObjectId);
	if (!source || !target) return "";
	return `
		<div class="wm-link-row">
			<button class="wm-link-chip" data-ontology-select="${source.id}">${objectMonogram(source)}<span>${escapeHtml(source.displayName)}</span></button>
			<div class="wm-link-meta">
				<span class="wm-link-name">${escapeHtml(link.name)}</span>
				<span class="wm-link-detail">${escapeHtml(link.cardinality)}${link.joinDescription ? " · " + escapeHtml(link.joinDescription) : ""}</span>
			</div>
			<span class="wm-link-arrow">──▶</span>
			<button class="wm-link-chip" data-ontology-select="${target.id}">${objectMonogram(target)}<span>${escapeHtml(target.displayName)}</span></button>
			<span class="wm-link-desc">${escapeHtml(link.description || "")}</span>
		</div>
	`;
};

const viewTabs = (store: Store): string => {
	const tabs: Array<{ key: string; label: string; icon: string }> = [
		{ key: "overview", label: "Overview", icon: "▤" },
		{ key: "graph", label: "Graph", icon: "✦" },
		{ key: "objects", label: "Objects", icon: "▦" },
	];
	return `
		<div class="wm-ontology-tabs">
			${tabs
				.map(
					(t) => `
				<button class="wm-ontology-tab${store.state.ontologyView === t.key ? " active" : ""}" data-ontology-view="${t.key}">
					<span class="wm-ontology-tab-icon">${t.icon}</span>${t.label}
				</button>
			`,
				)
				.join("")}
		</div>
	`;
};

const renderOverview = (store: Store): string => {
	const { state } = store;
	const stats = getOntologyStats(state.ontologyObjects, state.ontologyLinks, state.topics);
	const domains = getOntologyDomainList(state.ontologyObjects);
	const uncovered = getTopicsWithoutObject(state.ontologyObjects, state.topics);
	const pendingProposals = state.perceiveScenarios.filter((s) => s.status === "pending");
	const criticalProposals = pendingProposals.filter((s) => s.severity === "critical");

	const funnelStage = (label: string, value: string, sub: string, last = false) => `
		<div class="wm-funnel-stage">
			<div class="wm-funnel-value">${value}</div>
			<div class="wm-funnel-label">${label}</div>
			<div class="wm-funnel-sub">${sub}</div>
		</div>
		${last ? "" : '<div class="wm-funnel-arrow">──▶</div>'}
	`;

	return `
	<div class="wm-page">
		${viewTabs(store)}
		<div class="wm-page-hero">
			<div class="wm-page-hero-title">Ontology</div>
			<div class="wm-page-hero-desc">The business kernel of the platform — objects, relations and attributes built on your data estate. Every module exists to build a better Ontology.</div>
			<div class="wm-page-hero-kpis">
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.objects}</div>
					<div class="wm-hero-kpi-label">Business Objects</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.links}</div>
					<div class="wm-hero-kpi-label">Relations</div>
				</div>
				<div class="wm-hero-kpi">
					<div class="wm-hero-kpi-val">${stats.attributes + stats.derivedAttributes}</div>
					<div class="wm-hero-kpi-label">Attributes</div>
				</div>
				<div class="wm-hero-kpi ${stats.coverage >= 80 ? "green" : "orange"}">
					<div class="wm-hero-kpi-val">${stats.coverage}%</div>
					<div class="wm-hero-kpi-label">Topic Coverage</div>
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Construction Progress</div>
				<div class="wm-section-hint">Sources feed topics, topics materialize objects — the ontology build pipeline</div>
			</div>
			<div class="wm-ontology-funnel">
				${funnelStage("Data Sources", String(state.dataSources.length), "raw material captured")}
				${funnelStage("Topics", `${stats.coveredTopics}/${stats.totalTopics}`, "topics mapped to objects")}
				${funnelStage("Objects", String(stats.objects), `${stats.attributes} attributes · ${stats.derivedAttributes} derived`, true)}
			</div>
			${
				uncovered.length > 0
					? `<div class="wm-unmapped-strip">
						<span class="wm-unmapped-label">Not yet ontologized:</span>
						${uncovered
							.map(
								(t) => `
							<span class="wm-unmapped-chip">${escapeHtml(t.name)} ${topicTypeBadge(t.type)}</span>
						`,
							)
							.join("")}
						<button class="wm-btn wm-btn-ghost wm-btn-sm" data-nav="model">Map in Model</button>
					</div>`
					: ""
			}
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Business Domains</div>
				<div class="wm-section-hint">${domains.length} domains organize ${stats.objects} objects</div>
			</div>
			<div class="wm-obj-grid">
				${domains
					.map((domain) => {
						const objects = state.ontologyObjects.filter((o) => o.domain === domain);
						const attrCount = objects.reduce((sum, o) => sum + o.attributes.length, 0);
						const errors = objects.filter((o) => o.healthStatus === "error").length;
						const warnings = objects.filter((o) => o.healthStatus === "warning").length;
						return `
						<button class="wm-obj-domain-card" data-ontology-view="objects" data-ontology-catalog-filter="domain" data-ontology-catalog-filter-value="${escapeHtml(domain)}">
							<div class="wm-obj-domain-name">${escapeHtml(capitalize(domain))}</div>
							<div class="wm-obj-domain-meta">${objects.length} objects · ${attrCount} attributes</div>
							<div class="wm-obj-domain-health">
								${errors > 0 ? `<span class="wm-status-dot error"></span>${errors} error` : ""}
								${warnings > 0 ? `<span class="wm-status-dot warning"></span>${warnings} warning` : ""}
								${errors === 0 && warnings === 0 ? `<span class="wm-status-dot healthy"></span>all healthy` : ""}
							</div>
						</button>
					`;
					})
					.join("")}
			</div>
		</div>

		<div class="wm-ontology-two-col">
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Agent Proposals</div>
					<div class="wm-section-hint">AI proposes ontology changes, you approve</div>
				</div>
				${
					pendingProposals.length === 0
						? `<div class="wm-ontology-empty">No pending proposals. The Ontology is stable.</div>`
						: `<div class="wm-proposal-list">
							${pendingProposals
								.map(
									(s) => {
										const firstObjectId = (s.affectedObjectIds || [])[0];
										const firstObject = firstObjectId
											? state.ontologyObjects.find((o) => o.id === firstObjectId)
											: null;
										const summary = proposalAssetSummary(s);
										return `
									<div class="wm-proposal-row">
										<span class="wm-severity-dot ${s.severity}"></span>
										<div class="wm-proposal-main">
											<div class="wm-proposal-title">${escapeHtml(s.title)}</div>
											<div class="wm-proposal-sub">${escapeHtml(s.topicName)} · confidence ${s.confidence}%${summary ? " · " + escapeHtml(summary) : ""}</div>
										</div>
										${
											firstObject
												? `<button class="wm-obj-feed-chip" data-ontology-open="${firstObject.id}" title="Open ${firstObject.displayName} in Ontology">◆ ${escapeHtml(firstObject.displayName)}</button>`
												: ""
										}
										<button class="wm-btn wm-btn-ghost wm-btn-sm" data-perceive-select="${s.id}">Review</button>
									</div>
								`;
									},
								)
								.join("")}
							<button class="wm-btn wm-btn-primary wm-btn-sm" data-nav="perceive">Review ${pendingProposals.length} proposal${pendingProposals.length > 1 ? "s" : ""}${criticalProposals.length > 0 ? ` (${criticalProposals.length} critical)` : ""}</button>
						</div>`
				}
			</div>
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Business Glossary</div>
					<div class="wm-section-hint">${state.glossaryTerms.length} terms anchor business meaning to attributes</div>
				</div>
				<div class="wm-glossary-list">
					${state.glossaryTerms
						.slice(0, 5)
						.map(
							(t) => `
						<div class="wm-glossary-row">
							<span class="wm-glossary-name">${escapeHtml(t.displayName)}</span>
							${termStatusBadge(t)}
							<span class="wm-glossary-category">${escapeHtml(t.category)}</span>
						</div>
					`,
						)
						.join("")}
				</div>
				<button class="wm-btn wm-btn-ghost wm-btn-sm" data-nav="govern">Manage in Govern</button>
			</div>
		</div>
	</div>
	`;
};

const renderGraph = (store: Store): string => {
	const { state } = store;
	const uncovered = getTopicsWithoutObject(state.ontologyObjects, state.topics);

	return `
	<div class="wm-page">
		${viewTabs(store)}
		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Object Constellation</div>
				<div class="wm-section-hint">Business objects and their relations — click an object to inspect it</div>
			</div>
			<div class="wm-obj-grid">
				${state.ontologyObjects.map((o) => objectCard(store, o)).join("")}
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Relations</div>
				<div class="wm-section-hint">${state.ontologyLinks.length} typed links join objects into a graph</div>
			</div>
			<div class="wm-link-list">
				${state.ontologyLinks.map((l) => linkRow(store, l)).join("")}
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Materialization</div>
				<div class="wm-section-hint">Every object is materialized by physical topics</div>
			</div>
			<div class="wm-material-list">
				${state.ontologyObjects
					.map((o) => {
						const topics = state.topics.filter((t) => o.sourceTopicIds.includes(t.topicId));
						return `
						<div class="wm-material-row">
							<button class="wm-link-chip" data-ontology-select="${o.id}">${objectMonogram(o)}<span>${escapeHtml(o.displayName)}</span></button>
							<span class="wm-material-arrow">◀──</span>
							<div class="wm-material-topics">
								${topics
									.map(
										(t) => `
									<span class="wm-material-topic">${escapeHtml(t.name)} ${topicTypeBadge(t.type)} <span class="wm-status-dot ${t.healthStatus || "unknown"}"></span></span>
								`,
									)
									.join("")}
							</div>
						</div>
					`;
					})
					.join("")}
				${
					uncovered.length > 0
						? `<div class="wm-material-row unmapped">
							<span class="wm-link-chip muted"><span>—</span><span>Unmapped</span></span>
							<span class="wm-material-arrow">◀──</span>
							<div class="wm-material-topics">
								${uncovered.map((t) => `<span class="wm-unmapped-chip">${escapeHtml(t.name)} ${topicTypeBadge(t.type)}</span>`).join("")}
							</div>
						</div>`
						: ""
				}
			</div>
		</div>
	</div>
	`;
};

const renderCatalog = (store: Store): string => {
	const { state } = store;
	const filter = state.ontologyCatalogFilter;
	const domains = getOntologyDomainList(state.ontologyObjects);
	const sensitivities: OntologySensitivity[] = ["public", "internal", "confidential", "restricted"];

	const search = filter.search.trim().toLowerCase();
	const filtered = state.ontologyObjects.filter((o) => {
		if (filter.domain && o.domain !== filter.domain) return false;
		if (filter.sensitivity && o.sensitivity !== filter.sensitivity) return false;
		if (search) {
			const haystack = `${o.displayName} ${o.name} ${o.description || ""} ${o.domain}`.toLowerCase();
			if (!haystack.includes(search)) return false;
		}
		return true;
	});

	const pill = (key: string, value: string, label: string, activeValue: string) => `
		<button class="wm-filter-pill${activeValue === value ? " active" : ""}" data-ontology-catalog-filter="${key}" data-ontology-catalog-filter-value="${value}">${label}</button>
	`;

	return `
	<div class="wm-page">
		${viewTabs(store)}
		<div class="wm-section-card">
			<div class="wm-ontology-toolbar">
				<input type="text" class="wm-ontology-search" placeholder="Search objects..." value="${escapeHtml(filter.search)}" data-ontology-catalog-search autocomplete="off">
				<div class="wm-ontology-pill-group">
					${pill("domain", "", "All Domains", filter.domain)}
					${domains.map((d) => pill("domain", d, capitalize(d), filter.domain)).join("")}
				</div>
				<div class="wm-ontology-pill-group">
					${pill("sensitivity", "", "Any", filter.sensitivity)}
					${sensitivities.map((s) => pill("sensitivity", s, capitalize(s), filter.sensitivity)).join("")}
				</div>
			</div>
			<div class="wm-section-hint" style="padding: 0 24px 12px">${filtered.length} of ${state.ontologyObjects.length} objects</div>
			${
				filtered.length === 0
					? `<div class="wm-ontology-empty">No objects match the current filters.</div>`
					: `<div class="wm-obj-grid" style="padding: 0 24px 24px">${filtered.map((o) => objectCard(store, o)).join("")}</div>`
			}
		</div>
	</div>
	`;
};

const sampleValue = (attr: OntologyAttribute, row: number): string => {
	switch (attr.type) {
		case "number":
			return ((row + 1) * 168 + 59.5).toFixed(2);
		case "datetime":
			return `2026-05-2${row} 09:${10 + row}:00`;
		case "date":
			return `2026-05-2${row}`;
		case "boolean":
			return row % 2 === 0 ? "true" : "false";
		default:
			break;
	}
	if (attr.sourceFactor === "email") return `user${row + 1}@example.com`;
	// Raw sample: masking is applied by the policy layer, never baked in here.
	if (attr.sourceFactor === "phone") return `1380000${1000 + row}`;
	if (attr.sourceFactor.endsWith("_id")) {
		const prefix = attr.sourceFactor.includes("customer") || attr.sourceFactor.includes("user") ? "CUST" : "ORD";
		return `${prefix}-2026${String(1000 + row + 1)}`;
	}
	if (attr.sourceFactor === "order_status") return row === 0 ? "paid" : "shipped";
	return `${attr.label} ${row + 1}`;
};

const mockPreviewRows = (store: Store, object: OntologyObject): string => {
	const rows = [0, 1, 2];
	return `
		<table class="wm-preview-table">
			<thead>
				<tr>${object.attributes.map((a) => `<th>${escapeHtml(a.label)}</th>`).join("")}</tr>
			</thead>
			<tbody>
				${rows
					.map(
						(row) => `
					<tr>${object.attributes
						.map((a) => {
							const raw = sampleValue(a, row);
							const strategy = resolveMaskStrategy(a, store.state.maskingPolicies);
							const value = strategy ? maskValue(raw, strategy) : raw;
							return `<td>${escapeHtml(value)}${strategy ? ` <span class="wm-preview-mask">${escapeHtml(maskingStrategyLabel(strategy))}</span>` : ""}</td>`;
						})
						.join("")}</tr>
				`,
					)
					.join("")}
			</tbody>
		</table>
		<div class="wm-preview-hint">Preview applies masking policies exactly as the ontology query API would.</div>
	`;
};

const lineageButton = (store: Store, object: OntologyObject): string => {
	const primaryTopic: Topic | undefined = store.state.topics.find((t) => t.topicId === object.primaryTopicId);
	if (!primaryTopic) return "";
	const candidates = store.state.observabilityNodes.filter((n) => n.type === "topic" || n.type === "raw_topic");
	const exact = candidates.find((n) => n.name === primaryTopic.name);
	const partial = candidates.find((n) => primaryTopic.name.startsWith(n.name));
	const nodeId = exact ? exact.id : partial ? partial.id : "";
	if (nodeId) {
		return `<button class="wm-btn wm-btn-primary wm-btn-sm" data-observe-select-node="${nodeId}" data-observe-view="graph" data-observe-graph-zoom="node">View Lineage in Observe</button>`;
	}
	return `<button class="wm-btn wm-btn-ghost wm-btn-sm" data-nav="observe">Open Runtime Lineage</button>`;
};

const renderObjectDetail = (store: Store, object: OntologyObject): string => {
	const { state } = store;
	const links = getLinksForObject(state.ontologyLinks, object.id);
	const terms = getTermsForObject(state.glossaryTerms, object.id);
	const score = getObjectGovernanceScore(object, state.maskingPolicies);
	const objectTopics = state.topics.filter((t) => object.sourceTopicIds.includes(t.topicId));
	const topicNames = objectTopics.map((t) => t.name);

	// Object-level rules target the object's topics without a specific factor.
	const ruleIds = new Set<string>(object.attributes.flatMap((a) => a.qualityRuleIds || []));
	const objectLevelRules = state.governRules.filter(
		(r) => !r.targetFactor && r.targetTopic && topicNames.includes(r.targetTopic),
	);
	objectLevelRules.forEach((r) => ruleIds.add(r.ruleId));
	const relatedRules = state.governRules.filter((r) => ruleIds.has(r.ruleId));
	const relatedPolicies = state.maskingPolicies.filter(
		(p) => p.targetTopic && topicNames.includes(p.targetTopic),
	);

	return `
	<div class="wm-page">
		<div class="wm-ontology-breadcrumb">
			<button class="wm-ontology-back" data-ontology-select="">← All Objects</button>
			<span class="wm-ontology-breadcrumb-sep">/</span>
			<span class="wm-ontology-breadcrumb-item">${escapeHtml(object.displayName)}</span>
		</div>

		<div class="wm-section-card wm-obj-detail-head">
			<div class="wm-obj-detail-top">
				${objectMonogram(object)}
				<div class="wm-obj-detail-title-wrap">
					<div class="wm-obj-detail-title">${escapeHtml(object.displayName)}</div>
					<div class="wm-obj-detail-sub">${escapeHtml(object.name)} · ${escapeHtml(object.domain)}</div>
				</div>
				<div class="wm-obj-detail-badges">
					${sensitivityBadge(object.sensitivity)}
					${healthLabel(object.healthStatus)}
					<span class="wm-obj-score" title="Average attribute governance score">⛨ ${score}</span>
				</div>
			</div>
			<div class="wm-obj-detail-desc">${escapeHtml(object.description || "")}</div>
			<div class="wm-obj-detail-actions">
				${lineageButton(store, object)}
				<button class="wm-btn wm-btn-ghost wm-btn-sm" data-nav="govern">Open Govern</button>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Attributes</div>
				<div class="wm-section-hint">${object.attributes.length} attributes mapped onto physical topic factors</div>
			</div>
			<table class="wm-attr-table">
				<thead>
					<tr>
						<th>Attribute</th>
						<th>Type</th>
						<th>Source Mapping</th>
						<th>Governance</th>
						<th>Glossary</th>
					</tr>
				</thead>
				<tbody>
					${object.attributes
						.map((a) => {
							const gov = getAttributeGovernance(a, state.maskingPolicies);
							const attrTerms = (a.glossaryTermIds || [])
								.map((id) => state.glossaryTerms.find((t) => t.id === id))
								.filter(Boolean) as GlossaryTerm[];
							return `
							<tr>
								<td>
									<div class="wm-attr-name">${escapeHtml(a.label)}</div>
									<div class="wm-attr-mono">${escapeHtml(a.name)}</div>
								</td>
								<td><span class="wm-attr-type">${escapeHtml(a.type)}</span></td>
								<td>
									<span class="wm-attr-source">${escapeHtml(a.sourceTopic)} <span class="wm-attr-arrow">→</span> ${escapeHtml(a.sourceFactor)}</span>
								</td>
								<td>
									<div class="wm-attr-gov">
										${gov.qualityRules > 0 ? `<span class="wm-attr-gov-chip">${gov.qualityRules} rule${gov.qualityRules > 1 ? "s" : ""}</span>` : `<span class="wm-attr-gov-chip none">no rules</span>`}
										${
											gov.masked
												? `<span class="wm-attr-gov-chip mask${gov.maskEnabled ? "" : " off"}">${gov.maskEnabled ? "masked · " + escapeHtml(gov.maskStrategy) : "policy disabled"}</span>`
												: ""
										}
										${gov.uncoveredSensitivity ? `<span class="wm-attr-gov-chip gap">sensitive unmasked</span>` : ""}
									</div>
								</td>
								<td>
									${
										attrTerms.length > 0
											? attrTerms.map((t) => `<span class="wm-glossary-chip">${escapeHtml(t.displayName)}</span>`).join(" ")
											: `<span class="wm-attr-gov-chip none">—</span>`
									}
								</td>
							</tr>
						`;
						})
						.join("")}
				</tbody>
			</table>
		</div>

		${
			object.derivedAttributes.length > 0
				? `<div class="wm-section-card">
					<div class="wm-section-header">
						<div class="wm-section-title">Derived Attributes</div>
						<div class="wm-section-hint">Aggregations resolved through relation paths</div>
					</div>
					<div class="wm-derived-grid">
						${object.derivedAttributes
							.map(
								(d) => {
									const hops = d.path
										.map((token) => {
											const link = state.ontologyLinks.find((l) => l.id === token);
											if (link) return { kind: "link", label: link.name } as const;
											const hopObject = state.ontologyObjects.find((o) => o.id === token);
											return hopObject ? { kind: "object", label: hopObject.displayName } : null;
										})
										.filter(Boolean) as Array<{ kind: string; label: string }>;
									return `
								<div class="wm-derived-card">
									<div class="wm-derived-name">${escapeHtml(d.label)}</div>
									<div class="wm-derived-path">${escapeHtml(object.displayName)}${hops.map((h) => ` —${escapeHtml(h.label)}→`).join("")} · <b>${escapeHtml(d.aggregate)}(${escapeHtml(d.targetField)})</b></div>
									<div class="wm-derived-desc">${escapeHtml(d.description || "")}</div>
								</div>
							`;
								},
							)
							.join("")}
					</div>
				</div>`
				: ""
		}

		<div class="wm-ontology-two-col">
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Relations</div>
					<div class="wm-section-hint">${links.length} links touch this object</div>
				</div>
				<div class="wm-link-list">
					${links.length > 0 ? links.map((l) => linkRow(store, l)).join("") : `<div class="wm-ontology-empty">No relations defined yet.</div>`}
				</div>
			</div>
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Materialization</div>
					<div class="wm-section-hint">Physical topics backing this object</div>
				</div>
				<div class="wm-material-topics" style="padding: 4px 24px 16px">
					${objectTopics.map((t) => `<span class="wm-material-topic">${escapeHtml(t.name)} ${topicTypeBadge(t.type)} <span class="wm-status-dot ${t.healthStatus || "unknown"}"></span> ${formatCount(t.recordCount)} rows</span>`).join("")}
				</div>
				${
					terms.length > 0
						? `<div class="wm-section-header">
							<div class="wm-section-title">Glossary Terms</div>
							<div class="wm-section-hint">${terms.length} terms defined on this object</div>
						</div>
						<div class="wm-glossary-list" style="padding-bottom:16px">
							${terms.map((t) => `<div class="wm-glossary-row"><span class="wm-glossary-name">${escapeHtml(t.displayName)}</span>${termStatusBadge(t)}<span class="wm-glossary-def">${escapeHtml(t.definition)}</span></div>`).join("")}
						</div>`
						: ""
				}
			</div>
		</div>

		<div class="wm-ontology-two-col">
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Quality Rules</div>
					<div class="wm-section-hint">${relatedRules.length} rules guard this object's data</div>
				</div>
				<div class="wm-rule-list" style="padding: 4px 24px 16px">
					${
						relatedRules.length > 0
							? relatedRules
									.map(
										(r) => `
									<div class="wm-rule-row">
										<div class="wm-rule-main">
											<div class="wm-rule-name">${escapeHtml(r.name)}</div>
											<div class="wm-rule-topic">${escapeHtml(r.targetTopic || "")}${r.targetFactor ? " · " + escapeHtml(r.targetFactor) : ""}</div>
										</div>
										<span class="wm-severity-pill ${r.severity}">${capitalize(r.severity)}</span>
									</div>
								`,
									)
									.join("")
							: `<div class="wm-ontology-empty">No quality rules reference this object yet.</div>`
					}
				</div>
			</div>
			<div class="wm-section-card">
				<div class="wm-section-header">
					<div class="wm-section-title">Masking Policies</div>
					<div class="wm-section-hint">${relatedPolicies.length} policies apply to this object</div>
				</div>
				<div class="wm-rule-list" style="padding: 4px 24px 16px">
					${
						relatedPolicies.length > 0
							? relatedPolicies
									.map(
										(p) => `
									<div class="wm-rule-row">
										<div class="wm-rule-main">
											<div class="wm-rule-name">${escapeHtml(p.name)}</div>
											<div class="wm-rule-topic">${escapeHtml(p.targetTopic)} · ${escapeHtml(p.targetFactor)} · ${escapeHtml(p.strategy)}</div>
										</div>
										<span class="wm-attr-gov-chip ${p.enabled ? "mask" : "gap"}">${p.enabled ? "enabled" : "disabled"}</span>
									</div>
								`,
									)
									.join("")
							: `<div class="wm-ontology-empty">No masking policies target this object.</div>`
					}
				</div>
			</div>
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Open Proposals</div>
				<div class="wm-section-hint">Pending perception events that touch this object</div>
			</div>
			${
				pendingProposalsForObject(store, object.id).length === 0
					? `<div class="wm-ontology-empty">No open proposals touch this object.</div>`
					: `<div class="wm-proposal-list">
						${pendingProposalsForObject(store, object.id)
							.map((s) => {
								const summary = proposalAssetSummary(s);
								return `
							<div class="wm-proposal-row">
								<span class="wm-severity-dot ${s.severity}"></span>
								<div class="wm-proposal-main">
									<div class="wm-proposal-title">${escapeHtml(s.title)}</div>
									<div class="wm-proposal-sub">confidence ${s.confidence}%${summary ? " · " + escapeHtml(summary) : ""}</div>
								</div>
								<button class="wm-btn wm-btn-ghost wm-btn-sm" data-perceive-select="${s.id}">Review</button>
							</div>
						`;
							})
							.join("")}
					</div>`
			}
		</div>

		<div class="wm-section-card">
			<div class="wm-section-header">
				<div class="wm-section-title">Data Preview</div>
				<div class="wm-section-hint">Simulated result of the ontology query API for ${escapeHtml(object.displayName)}</div>
			</div>
			<div style="padding: 4px 24px 20px">
				${mockPreviewRows(store, object)}
			</div>
		</div>
	</div>
	`;
};

export const renderOntologyPage = (store: Store): string => {
	const selected = getObjectById(store.state.ontologyObjects, store.state.ontologySelectedObjectId);
	if (selected) {
		return renderObjectDetail(store, selected);
	}
	switch (store.state.ontologyView) {
		case "graph":
			return renderGraph(store);
		case "objects":
			return renderCatalog(store);
		default:
			return renderOverview(store);
	}
};
