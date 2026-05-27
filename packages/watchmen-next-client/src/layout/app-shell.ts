import { renderAgentPanel } from "../components/chat-panel";
import { renderMainContent } from "../routes/main-content";
import { Store } from "../state/store";
import { MainNavKey, ObservabilityGraphZoom } from "../types";
import { style } from "../styles";

export const renderAppShell = (container: HTMLElement, store: Store) => {
	const pendingCount = store.state.perceiveScenarios.filter((s) => s.status === "pending").length;

	container.innerHTML = `
<style>${style}</style>
<div class="wm-shell">
	<aside class="wm-sidebar">
		<div class="wm-sidebar-head">
			<div class="wm-sidebar-logo">W</div>
			<div class="wm-sidebar-brand">
				<div class="wm-sidebar-brand-title">Watchmen</div>
				<div class="wm-sidebar-brand-sub">Perceive Studio</div>
			</div>
		</div>
		<nav class="wm-nav-items">
			${store.data.mainNav
				.map(
					(item) => `
				<button class="wm-nav-item${item.key === store.state.main ? " active" : ""}" data-nav="${item.key}">
					<span class="wm-nav-icon">${item.icon}</span>
					<span class="wm-nav-label">${item.label}</span>
					${item.key === "perceive" && pendingCount > 0 ? `<span class="wm-nav-badge">${pendingCount}</span>` : ""}
				</button>
			`,
				)
				.join("")}
		</nav>
		<div class="wm-sidebar-foot">Agent-driven Data Engineering</div>
	</aside>
	<main class="wm-main-content">
		<div class="wm-scroll-area">
			${renderMainContent(store)}
			${renderAgentPanel(store)}
		</div>
	</main>
</div>`;
};

export const bindAppEvents = (container: HTMLElement, rerender: () => void, store: Store) => {
	// Nav click
	container.querySelectorAll<HTMLElement>("[data-nav]").forEach((node) => {
		node.onclick = () => {
			store.setMainNav(node.dataset.nav as MainNavKey);
			rerender();
		};
	});

	// Event filter tabs
	container.querySelectorAll<HTMLElement>("[data-filter]").forEach((node) => {
		node.onclick = () => {
			store.setEventFilter(node.dataset.filter as any);
			rerender();
		};
	});

	// Observability tabs
	container.querySelectorAll<HTMLElement>("[data-observe-view]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObservabilityView(node.dataset.observeView as any);
			rerender();
		});
	});

	container.querySelectorAll<HTMLElement>("[data-observe-direction]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObservabilityDirection(node.dataset.observeDirection as any);
			rerender();
		});
	});

	container.querySelectorAll<HTMLElement>("[data-observe-select-node]").forEach((node) => {
		node.addEventListener("click", () => {
			const nodeId = node.dataset.observeSelectNode;
			if (!nodeId) return;
			store.setObservabilityFocusNode(nodeId);
			if (node.dataset.observeView) {
				store.setObservabilityView(node.dataset.observeView as any);
			}
			if (store.state.main !== "observe") {
				store.setMainNav("observe");
			}
			rerender();
		});
	});

	// Scenario selection (click on event item)
	container.querySelectorAll<HTMLElement>("[data-scenario-id]").forEach((node) => {
		node.onclick = () => {
			store.selectScenario(node.dataset.scenarioId!);
			rerender();
		};
	});

	// Approve / Reject actions
	container.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((node) => {
		node.onclick = () => {
			const action = node.dataset.action;
			const scenarioId = node.dataset.id;
			if (!scenarioId) return;

			const nextStatus = action === "approve" ? "approved" : "rejected";
			store.setPerceiveScenarioStatus(scenarioId, nextStatus);

			// Add agent log
			store.addAgentLog({
				id: "log-" + Date.now(),
				timestamp: new Date().toLocaleString("en-US", { hour12: false }),
				action: "user_action",
				scenarioId,
				content:
					action === "approve"
						? "User approved suggested changes"
						: "User rejected suggested changes, configuration unchanged",
			});

			store.addChatMessage({
				id: "msg-" + Date.now(),
				role: "assistant",
				content:
					action === "approve"
						? "✅ Change confirmed. System will execute as recommended by the Agent."
						: "❌ Change rejected. Current configuration remains unchanged.",
			});

			rerender();
		};
	});

	// Agent panel toggle
	const agentHeader = container.querySelector<HTMLElement>(".wm-agent-header");
	if (agentHeader) {
		agentHeader.onclick = () => {
			const body = container.querySelector<HTMLElement>(".wm-agent-body");
			const toggle = container.querySelector<HTMLElement>(".wm-agent-toggle");
			if (body) body.classList.toggle("collapsed");
			if (toggle) toggle.classList.toggle("collapsed");
		};
	}

	// Agent input handling
	const agentInput = container.querySelector<HTMLInputElement>(".wm-agent-input");
	const agentSend = container.querySelector<HTMLButtonElement>(".wm-agent-send");

	const handleAgentSend = () => {
		if (agentInput && agentInput.value.trim()) {
			store.addChatMessage({
				id: "msg-" + Date.now(),
				role: "user",
				content: agentInput.value.trim(),
			});

			const userMsg = agentInput.value.trim();
			agentInput.value = "";

			// Mock AI response
			setTimeout(() => {
				store.addChatMessage({
					id: "msg-" + (Date.now() + 1),
					role: "assistant",
					content: `Received. I'll process your request: "${userMsg}". Please check the perception events panel for updates.`,
				});
				rerender();
			}, 600);
			rerender();
		}
	};

	if (agentSend) agentSend.onclick = handleAgentSend;
	if (agentInput) {
		agentInput.onkeydown = (e) => {
			if (e.key === "Enter") handleAgentSend();
		};
	}

	// Suggested Actions
	container.querySelectorAll<HTMLButtonElement>("[data-chat-action]").forEach((node) => {
		node.onclick = () => {
			const action = node.dataset.chatAction;
			store.addChatMessage({
				id: "msg-" + Date.now(),
				role: "user",
				content: `> Execute action: ${node.textContent}`,
			});

			if (action === "VIEW_PENDING") {
				store.setMainNav("perceive");
				store.setEventFilter("pending");
				const firstPending = store.state.perceiveScenarios.find((s) => s.status === "pending");
				if (firstPending) store.selectScenario(firstPending.id);
				setTimeout(() => {
					store.addChatMessage({
						id: "msg-" + (Date.now() + 1),
						role: "assistant",
						content: "Switched to pending events. Please review and process them in the main panel.",
					});
					rerender();
				}, 300);
			} else {
				setTimeout(() => {
					store.addChatMessage({
						id: "msg-" + (Date.now() + 1),
						role: "assistant",
						content: `Process started: ${action}. Please check the panel for progress.`,
					});
					rerender();
				}, 500);
			}
			rerender();
		};
	});

	// Global search input
	const globalSearch = container.querySelector<HTMLInputElement>("[data-observe-global-search]");
	if (globalSearch) {
		globalSearch.addEventListener("input", () => {
			store.setObserveGlobalSearch(globalSearch.value);
			rerender();
		});
	}

	// Catalog search input
	const catalogSearch = container.querySelector<HTMLInputElement>("[data-observe-catalog-search]");
	if (catalogSearch) {
		catalogSearch.addEventListener("input", () => {
			store.setObserveCatalogFilter({ search: catalogSearch.value, page: 1 });
			rerender();
		});
	}

	// Catalog filter pills
	container.querySelectorAll<HTMLElement>("[data-observe-catalog-filter]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObserveCatalogFilter({
				[node.dataset.observeCatalogFilter!]: node.dataset.observeCatalogFilterValue || "",
			});
			rerender();
		});
	});

	// Catalog sort
	container.querySelectorAll<HTMLElement>("[data-observe-catalog-sort]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObserveCatalogFilter({ sort: node.dataset.observeCatalogSort as any });
			rerender();
		});
	});

	// Catalog pagination
	container.querySelectorAll<HTMLElement>("[data-observe-catalog-page]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObserveCatalogFilter({ page: Number(node.dataset.observeCatalogPage) });
			rerender();
		});
	});

	// Graph zoom: click stage cluster
	container.querySelectorAll<HTMLElement>("[data-observe-graph-zoom-stage]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObserveGraphZoom("domain", node.dataset.observeGraphZoomStage || "");
			rerender();
		});
	});

	// Graph zoom: click domain card
	container.querySelectorAll<HTMLElement>("[data-observe-graph-zoom-domain]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObserveGraphZoom("node", node.dataset.observeGraphZoomDomain || "");
			rerender();
		});
	});

	// Graph zoom out (back button)
	container.querySelectorAll<HTMLElement>("[data-observe-graph-zoom-out]").forEach((node) => {
		node.addEventListener("click", () => {
			const targetZoom = node.dataset.observeGraphZoomOut as ObservabilityGraphZoom;
			store.setObserveGraphZoom(targetZoom, "");
			rerender();
		});
	});

	// Event filter pills
	container.querySelectorAll<HTMLElement>("[data-observe-event-filter]").forEach((node) => {
		node.addEventListener("click", () => {
			const key = node.dataset.observeEventFilter!;
			const value = node.dataset.observeEventFilterValue || "";
			store.setObserveEventFilter({ [key]: value, page: 1 });
			rerender();
		});
	});

	// Event pagination
	container.querySelectorAll<HTMLElement>("[data-observe-event-page]").forEach((node) => {
		node.addEventListener("click", () => {
			store.setObserveEventFilter({ page: Number(node.dataset.observeEventPage) });
			rerender();
		});
	});
};
