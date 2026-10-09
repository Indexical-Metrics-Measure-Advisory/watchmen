import type {
	Materialization,
	MaterializationFlow,
	MaterializationRun,
	MaterializationRunStatus,
	MockDimensionOption,
	MockMetricOption,
	FlowGraph,
	PageResult,
	RunFilter
} from '@/model/materialization';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import {
	buildMockFactorMapping,
	getMockDimensions,
	mockMetricOptions,
	mockTargetTopics,
	seedFlows,
	seedFlowGraphs,
	seedMaterializations,
	seedRuns
} from './materializationMockData';

// Mock data is opt-in via VITE_MATERIALIZATION_USE_MOCK=true (local dev without a backend);
// production builds always talk to the metricflow materialization endpoints.
const USE_MOCK = import.meta.env.VITE_MATERIALIZATION_USE_MOCK === 'true';
const BASE_URL = `${API_BASE_URL}/metricflow/materialization`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory mock store (module scope so state survives HMR-less navigation)
let mockMaterializations: Materialization[] = seedMaterializations.map((m) => ({ ...m }));
const mockRuns: MaterializationRun[] = seedRuns.map((r) => ({ ...r }));
const mockFlows: MaterializationFlow[] = seedFlows.map((f) => ({ ...f }));
let idSeq = 100;
let runSeq = 2000;

const nowISO = () => new Date().toISOString();

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

class MaterializationService {
	private static instance: MaterializationService;

	private constructor() {}

	public static getInstance(): MaterializationService {
		if (!MaterializationService.instance) {
			MaterializationService.instance = new MaterializationService();
		}
		return MaterializationService.instance;
	}

	async listMaterializations(keyword?: string): Promise<Materialization[]> {
		if (USE_MOCK) {
			await delay(300);
			return clone(mockMaterializations);
		}
		const response = await fetch(`${BASE_URL}/page`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify({ pageNumber: 1, pageSize: 200, keyword: keyword?.trim() || undefined })
		});
		const result = await checkResponse(response);
		return (result?.data ?? result) as Materialization[];
	}

	async saveMaterialization(input: Partial<Materialization>): Promise<Materialization> {
		if (USE_MOCK) {
			await delay(400);
			if (input.materializationId) {
				const index = mockMaterializations.findIndex((m) => m.materializationId === input.materializationId);
				if (index === -1) {
					throw new Error('Materialization not found');
				}
				mockMaterializations[index] = {
					...mockMaterializations[index],
					...input,
					factorMapping:
						input.factorMapping ??
						buildMockFactorMapping(
							input.metricName ?? mockMaterializations[index].metricName,
							input.timeGrain ?? mockMaterializations[index].timeGrain,
							input.groupBy ?? mockMaterializations[index].groupBy
						),
					updatedAt: nowISO()
				};
				return clone(mockMaterializations[index]);
			}
			const created: Materialization = {
				materializationId: `mat_${String(++idSeq).padStart(3, '0')}`,
				name: input.name,
				metricId: input.metricId ?? '',
				metricName: input.metricName ?? '',
				metricLabel: input.metricLabel,
				targetTopicId: input.targetTopicId,
				targetTopicName: input.targetTopicName,
				autoCreateTopic: input.autoCreateTopic ?? true,
				timeGrain: input.timeGrain ?? 'day',
				groupBy: input.groupBy ?? [],
				writeMode: input.writeMode ?? 'MERGE',
				engine: input.engine ?? 'AUTO',
				schedule: input.schedule ?? { enabled: false, frequency: 'day', time: '02:00' },
				factorMapping:
					input.factorMapping ??
					buildMockFactorMapping(input.metricName ?? '', input.timeGrain ?? 'day', input.groupBy ?? []),
				enabled: input.enabled ?? true,
				description: input.description,
				createdAt: nowISO(),
				updatedAt: nowISO()
			};
			mockMaterializations.unshift(created);
			return clone(created);
		}
		const response = await fetch(BASE_URL, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(input)
		});
		return checkResponse(response);
	}

	async deleteMaterialization(materializationId: string): Promise<void> {
		if (USE_MOCK) {
			await delay(300);
			mockMaterializations = mockMaterializations.filter((m) => m.materializationId !== materializationId);
			return;
		}
		const response = await fetch(`${BASE_URL}/delete?materialization_id=${materializationId}`, {
			method: 'DELETE',
			headers: getDefaultHeaders()
		});
		await checkResponse(response);
	}

	async setEnabled(materializationId: string, enabled: boolean): Promise<Materialization> {
		if (USE_MOCK) {
			await delay(250);
			const target = mockMaterializations.find((m) => m.materializationId === materializationId);
			if (!target) {
				throw new Error('Materialization not found');
			}
			// the job switch is independent of the schedule switch, mirroring the backend
			target.enabled = enabled;
			target.updatedAt = nowISO();
			return clone(target);
		}
		// partial update on the backend: only the enabled flag is sent so the
		// stored schedule (time/weekday/...) is never overwritten with defaults
		return this.saveMaterialization({ materializationId, enabled });
	}

	async runMaterializations(materializationIds: string[]): Promise<MaterializationRun[]> {
		if (USE_MOCK) {
			await delay(500);
			const created: MaterializationRun[] = [];
			materializationIds.forEach((id) => {
				const mat = mockMaterializations.find((m) => m.materializationId === id);
				if (!mat) {
					return;
				}
				const run: MaterializationRun = {
					runId: `run_${++runSeq}`,
					materializationId: id,
					materializationName: mat.name || mat.metricName,
					metricName: mat.metricName,
					status: 'PENDING',
					triggerType: 'manual',
					engine: mat.engine,
					windowStart: new Date().toISOString().slice(0, 10),
					windowEnd: new Date().toISOString().slice(0, 10),
					sqlPreview: `-- preview for ${mat.metricName}\nSELECT statDate, ..., metric_value FROM ${mat.targetTopicName ?? 'auto_created_topic'}`,
					startedAt: nowISO()
				};
				mockRuns.unshift(run);
				created.push(run);

				// Simulate lifecycle: PENDING -> RUNNING -> SUCCESS
				setTimeout(() => {
					run.status = 'RUNNING';
				}, 800);
				setTimeout(() => {
					run.status = 'SUCCESS';
					run.rowCount = 10 + Math.floor(Math.random() * 40);
					run.durationMs = 1500 + Math.floor(Math.random() * 4000);
					run.finishedAt = nowISO();
				}, 2300);
			});
			return clone(created);
		}
		const response = await fetch(`${BASE_URL}/run`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify({ materializationIds })
		});
		return checkResponse(response);
	}

	async pageRuns(filter: RunFilter): Promise<PageResult<MaterializationRun>> {
		if (USE_MOCK) {
			await delay(300);
			let rows = [...mockRuns];
			const keyword = filter.keyword?.trim().toLowerCase();
			if (keyword) {
				rows = rows.filter(
					(r) =>
						(r.materializationName ?? '').toLowerCase().includes(keyword) ||
						(r.metricName ?? '').toLowerCase().includes(keyword) ||
						r.runId.toLowerCase().includes(keyword)
				);
			}
			if (filter.status && filter.status !== 'ALL') {
				rows = rows.filter((r) => r.status === filter.status);
			}
			if (filter.materializationId) {
				rows = rows.filter((r) => r.materializationId === filter.materializationId);
			}
			const itemCount = rows.length;
			const pageNumber = Math.max(1, filter.pageNumber);
			const pageSize = Math.max(1, filter.pageSize);
			const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
			const start = (pageNumber - 1) * pageSize;
			return {
				data: clone(rows.slice(start, start + pageSize)),
				itemCount,
				pageNumber,
				pageSize,
				pageCount
			};
		}
		const response = await fetch(`${BASE_URL}/runs/page`, {
			method: 'POST',
			headers: getDefaultHeaders(),
			body: JSON.stringify(filter)
		});
		return checkResponse(response);
	}

	async listFlows(): Promise<MaterializationFlow[]> {
		if (USE_MOCK) {
			await delay(250);
			return clone(mockFlows);
		}
		const response = await fetch(`${API_BASE_URL}/metricflow/materialization/flow/all`, {
			headers: getDefaultHeaders()
		});
		return checkResponse(response);
	}

	async getFlowGraph(flowId: string): Promise<FlowGraph> {
		if (USE_MOCK) {
			await delay(350);
			const flow = mockFlows.find((f) => f.flowId === flowId);
			const graph = seedFlowGraphs[flowId];
			if (!flow || !graph) {
				throw new Error('Flow not found');
			}
			return {
				flowId: flow.flowId,
				flowName: flow.name,
				nodes: clone(graph.nodes),
				edges: clone(graph.edges)
			};
		}
		const response = await fetch(`${API_BASE_URL}/metricflow/materialization/flow/${flowId}/graph`, {
			headers: getDefaultHeaders()
		});
		return checkResponse(response);
	}

	async runFlow(flowId: string): Promise<MaterializationRun[]> {
		if (USE_MOCK) {
			await delay(500);
			const flow = mockFlows.find((f) => f.flowId === flowId);
			if (!flow) {
				throw new Error('Flow not found');
			}
			return this.runMaterializations(flow.materializationIds);
		}
		const response = await fetch(`${API_BASE_URL}/metricflow/materialization/flow/run/${flowId}`, {
			method: 'POST',
			headers: getDefaultHeaders()
		});
		return checkResponse(response);
	}

	// --- helpers for form dialog data ---

	async getMetricOptions(): Promise<MockMetricOption[]> {
		if (USE_MOCK) {
			await delay(200);
			return clone(mockMetricOptions);
		}
		// no silent mock fallback here: an error must surface instead of
		// presenting fake metrics/topics as if they were real ones
		const response = await fetch(`${API_BASE_URL}/metricflow/metrics/all`, {
			headers: getDefaultHeaders()
		});
		const data = await checkResponse(response);
		const list = Array.isArray(data) ? data : (data?.metrics ?? []);
		return list.map((m: { name: string; label?: string; id?: string }) => ({
			id: m.id ?? m.name,
			name: m.name,
			label: m.label ?? m.name
		}));
	}

	async getDimensionsByMetric(metricName: string): Promise<MockDimensionOption[]> {
		if (USE_MOCK) {
			await delay(250);
			return getMockDimensions(metricName);
		}
		const response = await fetch(
			`${API_BASE_URL}/metricflow/dimensions_by_metric?metric_name=${encodeURIComponent(metricName)}`,
			{ headers: getDefaultHeaders() }
		);
		const data = await checkResponse(response);
		const dims = Array.isArray(data) ? data : (data?.dimensions ?? []);
		return dims.map((d: { name: string; qualified_name?: string }) => ({
			id: d.name,
			name: d.name,
			qualifiedName: d.qualified_name
		}));
	}

	async getTargetTopics(): Promise<{ id: string; name: string }[]> {
		if (USE_MOCK) {
			await delay(200);
			return clone(mockTargetTopics);
		}
		const response = await fetch(`${API_BASE_URL}/metricflow/topics/mart`, {
			headers: getDefaultHeaders()
		});
		const data = await checkResponse(response);
		const list = Array.isArray(data) ? data : [];
		return list.map((item: { topic?: { topicId: string; name: string } }) => ({
			id: item.topic?.topicId ?? '',
			name: item.topic?.name ?? ''
		})).filter((t: { id: string }) => t.id);
	}

	// Exposed for tests / debugging: swap mock status without rebuild
	get isMockMode(): boolean {
		return USE_MOCK;
	}
}

export const materializationService = MaterializationService.getInstance();
