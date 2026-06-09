// Business Glossary service layer.
// Encapsulates remote API calls and provides a mock fallback so the page can run
// standalone (VITE_USE_MOCK_DATA=true) or against the watchmen backend.
import {
	type SectionId,
	type Standard,
	type StandardBundle,
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
}

export const businessGlossaryService = new BusinessGlossaryService();
