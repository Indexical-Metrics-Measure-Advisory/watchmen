// Business Glossary service layer.
// Encapsulates remote API calls and provides a mock fallback so the page can run
// standalone (VITE_USE_MOCK_DATA=true) or against the watchmen backend.
import {
	type SectionId,
	type Standard,
	type StandardBundle,
	type StandardStatus,
	type TableEntry,
	type FieldCodeEntry,
	type CodeValueEntry,
	type TermEntry,
	type NamingEntry,
	type DependencyEntry,
	type OverviewEntry,
} from "@/model/businessGlossary";
import { API_AI_URL, getDefaultHeaders, checkResponse } from "@/utils/apiConfig";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === "true";

export type EntryRow =
	| TableEntry
	| FieldCodeEntry
	| CodeValueEntry
	| TermEntry
	| NamingEntry
	| DependencyEntry
	| OverviewEntry;

const ENDPOINT = `${API_AI_URL}/business-glossary`;

export class BusinessGlossaryService {
	// ---- Standards ----
	async listStandards(): Promise<StandardBundle[]> {
		if (isMockMode) {
			await delay(300);
			return this.mockBundles;
		}
		const response = await fetch(ENDPOINT, { headers: getDefaultHeaders() });
		return checkResponse(response);
	}

	async getStandard(id: string): Promise<StandardBundle | undefined> {
		if (isMockMode) {
			await delay(200);
			return this.mockBundles.find((b) => b.standard.id === id);
		}
		const response = await fetch(`${ENDPOINT}/${id}`, { headers: getDefaultHeaders() });
		return checkResponse(response);
	}

	async createStandard(standard: Standard): Promise<Standard> {
		if (isMockMode) {
			await delay(200);
			const bundle: StandardBundle = {
				standard,
				entries: { tables: [], fields: [], codes: [], terms: [], naming: [], dependencies: [], overview: [] },
			};
			this.mockBundles.push(bundle);
			return standard;
		}
		const response = await fetch(`${ENDPOINT}/standard`, {
			method: "POST",
			headers: getDefaultHeaders(),
			body: JSON.stringify(standard),
		});
		return checkResponse(response);
	}

	async updateStandard(standard: Standard): Promise<Standard> {
		if (isMockMode) {
			await delay(200);
			const bundle = this.mockBundles.find((b) => b.standard.id === standard.id);
			if (bundle) bundle.standard = standard;
			return standard;
		}
		const response = await fetch(`${ENDPOINT}/standard/update`, {
			method: "POST",
			headers: getDefaultHeaders(),
			body: JSON.stringify(standard),
		});
		return checkResponse(response);
	}

	async deleteStandard(id: string): Promise<void> {
		if (isMockMode) {
			await delay(200);
			this.mockBundles = this.mockBundles.filter((b) => b.standard.id !== id);
			return;
		}
		const response = await fetch(`${ENDPOINT}/standard/${id}`, {
			method: "DELETE",
			headers: getDefaultHeaders(),
		});
		await checkResponse(response);
	}

	// ---- Entries (per section) ----
	async createEntry(standardId: string, section: SectionId, row: EntryRow): Promise<EntryRow> {
		if (isMockMode) {
			await delay(150);
			const bundle = this.mockBundles.find((b) => b.standard.id === standardId);
			if (bundle) (bundle.entries[section] as EntryRow[]).push(row);
			return row;
		}
		const response = await fetch(`${ENDPOINT}/${standardId}/${section}`, {
			method: "POST",
			headers: getDefaultHeaders(),
			body: JSON.stringify(row),
		});
		return checkResponse(response);
	}

	async updateEntry(standardId: string, section: SectionId, row: EntryRow): Promise<EntryRow> {
		if (isMockMode) {
			await delay(150);
			const bundle = this.mockBundles.find((b) => b.standard.id === standardId);
			if (bundle) {
				const list = bundle.entries[section] as EntryRow[];
				const idx = list.findIndex((r) => r.id === row.id);
				if (idx >= 0) list[idx] = row;
			}
			return row;
		}
		const response = await fetch(`${ENDPOINT}/${standardId}/${section}/update`, {
			method: "POST",
			headers: getDefaultHeaders(),
			body: JSON.stringify(row),
		});
		return checkResponse(response);
	}

	async deleteEntry(standardId: string, section: SectionId, entryId: string): Promise<void> {
		if (isMockMode) {
			await delay(150);
			const bundle = this.mockBundles.find((b) => b.standard.id === standardId);
			if (bundle) {
				const entries = bundle.entries;
				switch (section) {
					case "tables":
						entries.tables = entries.tables.filter((r) => r.id !== entryId);
						break;
					case "fields":
						entries.fields = entries.fields.filter((r) => r.id !== entryId);
						break;
					case "codes":
						entries.codes = entries.codes.filter((r) => r.id !== entryId);
						break;
					case "terms":
						entries.terms = entries.terms.filter((r) => r.id !== entryId);
						break;
					case "naming":
						entries.naming = entries.naming.filter((r) => r.id !== entryId);
						break;
					case "dependencies":
						entries.dependencies = entries.dependencies.filter((r) => r.id !== entryId);
						break;
					case "overview":
						entries.overview = entries.overview.filter((r) => r.id !== entryId);
						break;
				}
			}
			return;
		}
		const response = await fetch(`${ENDPOINT}/${standardId}/${section}/${entryId}`, {
			method: "DELETE",
			headers: getDefaultHeaders(),
		});
		await checkResponse(response);
	}

	// ---- Mock store ----
	// The component seeds its own STANDARDS fixture; this empty array is used as
	// the in-memory store when VITE_USE_MOCK_DATA=true and the component pushes
	// through createStandard. Pages may inject fixtures via setMockStore().
	private mockBundles: StandardBundle[] = [];

	setMockStore(bundles: StandardBundle[]): void {
		this.mockBundles = bundles;
	}

	// ---- Agent YAML operations (CLI / AI Agent) ----

	/** Pull all standards in agent-view YAML format */
	async pullAllYaml(): Promise<string> {
		if (isMockMode) {
			await delay(300);
			// Return a simple YAML representation of all bundles
			return this.mockBundles
				.map((b) => {
					return [
						`name: ${b.standard.name}`,
						`abbreviation: ${b.standard.abbreviation}`,
						`description: ${b.standard.description || ""}`,
						`version: ${b.standard.version || ""}`,
						`status: ${b.standard.status}`,
						`sourceUrl: ${b.standard.sourceUrl || ""}`,
						"tags:",
						...(b.standard.tags || []).map((t) => `  - ${t}`),
						"entries:",
						`  overview: ${JSON.stringify(b.entries?.overview || [])}`,
						`  tables: ${JSON.stringify(b.entries?.tables || [])}`,
						`  fields: ${JSON.stringify(b.entries?.fields || [])}`,
						`  codes: ${JSON.stringify(b.entries?.codes || [])}`,
						`  terms: ${JSON.stringify(b.entries?.terms || [])}`,
						`  naming: ${JSON.stringify(b.entries?.naming || [])}`,
						`  dependencies: ${JSON.stringify(b.entries?.dependencies || [])}`,
					].join("\n");
				})
				.join("\n---\n");
		}
		const response = await fetch(`${ENDPOINT}/all/yaml/agent-view`, {
			headers: { ...getDefaultHeaders(), Accept: "application/x-yaml" },
		});
		if (!response.ok) {
			throw new Error(`Failed to pull all YAML: ${response.statusText}`);
		}
		return response.text();
	}

	/** Pull a single standard by name in agent-view YAML format */
	async pullYamlByName(name: string): Promise<string> {
		if (isMockMode) {
			await delay(200);
			const bundle = this.mockBundles.find((b) => b.standard.name === name);
			if (!bundle) {
				throw new Error(`Standard not found: ${name}`);
			}
			return [
				`name: ${bundle.standard.name}`,
				`abbreviation: ${bundle.standard.abbreviation}`,
				`description: ${bundle.standard.description || ""}`,
				`version: ${bundle.standard.version || ""}`,
				`status: ${bundle.standard.status}`,
				`sourceUrl: ${bundle.standard.sourceUrl || ""}`,
				"tags:",
				...(bundle.standard.tags || []).map((t) => `  - ${t}`),
				"entries:",
				`  overview: ${JSON.stringify(bundle.entries?.overview || [])}`,
				`  tables: ${JSON.stringify(bundle.entries?.tables || [])}`,
				`  fields: ${JSON.stringify(bundle.entries?.fields || [])}`,
				`  codes: ${JSON.stringify(bundle.entries?.codes || [])}`,
				`  terms: ${JSON.stringify(bundle.entries?.terms || [])}`,
				`  naming: ${JSON.stringify(bundle.entries?.naming || [])}`,
				`  dependencies: ${JSON.stringify(bundle.entries?.dependencies || [])}`,
			].join("\n");
		}
		const response = await fetch(`${ENDPOINT}/name/yaml/agent-view?name=${encodeURIComponent(name)}`, {
			headers: { ...getDefaultHeaders(), Accept: "application/x-yaml" },
		});
		if (!response.ok) {
			throw new Error(`Failed to pull YAML for ${name}: ${response.statusText}`);
		}
		return response.text();
	}

	/** Push (upsert) a standard in agent-view YAML format */
	async pushYaml(yamlContent: string): Promise<void> {
		if (isMockMode) {
			await delay(300);
			// Parse simple YAML and upsert to mock store
			const lines = yamlContent.split("\n");
			const data: Record<string, string> = {};
			for (const line of lines) {
				const match = line.match(/^(\w+):\s*(.*)$/);
				if (match && !line.startsWith(" ")) {
					data[match[1]] = match[2];
				}
			}
			const name = data.name;
			if (!name) {
				throw new Error('YAML must contain "name" field');
			}
			const existing = this.mockBundles.find((b) => b.standard.name === name);
			if (existing) {
				// Update existing
				existing.standard.abbreviation = data.abbreviation || existing.standard.abbreviation;
				existing.standard.description = data.description || existing.standard.description;
				existing.standard.version = data.version || existing.standard.version;
				existing.standard.status = (data.status as StandardStatus) || existing.standard.status;
				existing.standard.sourceUrl = data.sourceUrl || existing.standard.sourceUrl;
			} else {
				// Create new
				const newBundle: StandardBundle = {
					standard: {
						id: `mock-${Date.now()}`,
						name,
						abbreviation: data.abbreviation || "",
						description: data.description || "",
						version: data.version || "",
						status: (data.status as StandardStatus) || "draft",
						sourceUrl: data.sourceUrl || "",
						tags: [],
					},
					entries: {
						overview: [],
						tables: [],
						fields: [],
						codes: [],
						terms: [],
						naming: [],
						dependencies: [],
					},
				};
				this.mockBundles.push(newBundle);
			}
			return;
		}
		const response = await fetch(`${ENDPOINT}/yaml/agent-upsert`, {
			method: "POST",
			headers: { ...getDefaultHeaders(), "Content-Type": "application/x-yaml" },
			body: yamlContent,
		});
		if (!response.ok) {
			throw new Error(`Failed to push YAML: ${response.statusText}`);
		}
	}
}

export const businessGlossaryService = new BusinessGlossaryService();
