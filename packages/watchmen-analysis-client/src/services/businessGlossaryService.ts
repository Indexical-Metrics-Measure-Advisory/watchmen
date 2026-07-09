import type {
  Glossary,
  GlossaryBundle,
  Category,
  Term,
  GlossaryUpsert,
  CategoryUpsert,
  TermUpsert,
  TermDeleteRequest,
  CategoryDeleteRequest,
  TermRelationUpsert,
  TermEntityAssignmentUpsert,
} from "@/model/glossaryV2";
import { API_BASE_URL, getDefaultHeaders, checkResponse } from "@/utils/apiConfig";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === "true";

const ENDPOINT = `${API_BASE_URL}/metricflow/business-glossary`;

export class BusinessGlossaryService {
  // ---- Glossary ----
  async listGlossaries(): Promise<GlossaryBundle[]> {
    if (isMockMode) {
      await delay(300);
      return this.mockBundles;
    }
    const response = await fetch(ENDPOINT, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  async getGlossary(id: string): Promise<GlossaryBundle | undefined> {
    if (isMockMode) {
      await delay(200);
      return this.mockBundles.find((b) => b.glossary.id === id);
    }
    const response = await fetch(`${ENDPOINT}/${id}`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  async createGlossary(glossary: GlossaryUpsert): Promise<Glossary> {
    if (isMockMode) {
      await delay(200);
      const newGlossary: Glossary = {
        id: `mock-${Date.now()}`,
        name: glossary.name,
        display_name: glossary.display_name || glossary.name,
        description: glossary.description,
        language: glossary.language,
        status: glossary.status,
        owner: glossary.owner,
        tags: glossary.tags || [],
      };
      this.mockBundles.push({ glossary: newGlossary, categories: [], terms: [] });
      return newGlossary;
    }
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(glossary),
    });
    return checkResponse(response);
  }

  async updateGlossary(glossary: GlossaryUpsert): Promise<Glossary> {
    if (isMockMode) {
      await delay(200);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossary.id);
      if (bundle && glossary.id) {
        bundle.glossary = { ...bundle.glossary, ...glossary, id: glossary.id };
        return bundle.glossary;
      }
      throw new Error(`Glossary not found: ${glossary.id}`);
    }
    const response = await fetch(`${ENDPOINT}/update`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(glossary),
    });
    return checkResponse(response);
  }

  async deleteGlossary(id: string): Promise<void> {
    if (isMockMode) {
      await delay(200);
      this.mockBundles = this.mockBundles.filter((b) => b.glossary.id !== id);
      return;
    }
    const response = await fetch(`${ENDPOINT}/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({ glossary_id: id }),
    });
    await checkResponse(response);
  }

  // ---- Category ----
  async createCategory(glossaryId: string, category: CategoryUpsert): Promise<Category> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (!bundle) throw new Error(`Glossary not found: ${glossaryId}`);
      const newCategory: Category = {
        id: category.id || `mock-c-${Date.now()}`,
        name: category.name,
        qualified_name: `${category.name}@${bundle.glossary.name}`,
        description: category.description,
        parent_category_id: category.parent_category_id,
        glossary_id: glossaryId,
        order_index: category.order_index || 0,
      };
      bundle.categories.push(newCategory);
      return newCategory;
    }
    const response = await fetch(`${ENDPOINT}/${glossaryId}/categories`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(category),
    });
    return checkResponse(response);
  }

  async updateCategory(glossaryId: string, category: CategoryUpsert): Promise<Category> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (!bundle) throw new Error(`Glossary not found: ${glossaryId}`);
      const idx = bundle.categories.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        bundle.categories[idx] = { ...bundle.categories[idx], ...category };
        return bundle.categories[idx];
      }
      throw new Error(`Category not found: ${category.id}`);
    }
    const response = await fetch(`${ENDPOINT}/${glossaryId}/categories/update`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(category),
    });
    return checkResponse(response);
  }

  async deleteCategory(glossaryId: string, categoryId: string): Promise<void> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (bundle) {
        bundle.categories = bundle.categories.filter((c) => c.id !== categoryId);
      }
      return;
    }
    const response = await fetch(`${ENDPOINT}/${glossaryId}/categories/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({ category_id: categoryId } as CategoryDeleteRequest),
    });
    await checkResponse(response);
  }

  // ---- Term ----
  async createTerm(glossaryId: string, term: TermUpsert): Promise<Term> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (!bundle) throw new Error(`Glossary not found: ${glossaryId}`);
      const newTerm: Term = {
        id: term.id || `mock-t-${Date.now()}`,
        name: term.name,
        qualified_name: `${term.name}@${bundle.glossary.name}`,
        display_name: term.display_name,
        description: term.description,
        short_description: term.short_description,
        abbreviation: term.abbreviation,
        examples: term.examples,
        status: term.status,
        glossary_id: glossaryId,
        category_ids: term.category_ids || [],
        synonyms: term.synonyms || [],
        related_terms: term.related_terms || [],
        antonyms: term.antonyms || [],
        is_a: term.is_a || [],
        assigned_entities: [],
        owner: term.owner,
        steward: term.steward,
        source_url: term.source_url,
      };
      bundle.terms.push(newTerm);
      return newTerm;
    }
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(term),
    });
    return checkResponse(response);
  }

  async updateTerm(glossaryId: string, term: TermUpsert): Promise<Term> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (!bundle) throw new Error(`Glossary not found: ${glossaryId}`);
      const idx = bundle.terms.findIndex((t) => t.id === term.id);
      if (idx >= 0) {
        bundle.terms[idx] = { ...bundle.terms[idx], ...term };
        return bundle.terms[idx];
      }
      throw new Error(`Term not found: ${term.id}`);
    }
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms/update`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(term),
    });
    return checkResponse(response);
  }

  async deleteTerm(glossaryId: string, termId: string): Promise<void> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (bundle) {
        bundle.terms = bundle.terms.filter((t) => t.id !== termId);
      }
      return;
    }
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({ term_id: termId } as TermDeleteRequest),
    });
    await checkResponse(response);
  }

  async searchTerms(glossaryId: string, query: string): Promise<Term[]> {
    if (isMockMode) {
      await delay(150);
      const bundle = this.mockBundles.find((b) => b.glossary.id === glossaryId);
      if (!bundle) return [];
      const q = query.toLowerCase();
      return bundle.terms.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.display_name && t.display_name.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.short_description && t.short_description.toLowerCase().includes(q))
      );
    }
    const response = await fetch(
      `${ENDPOINT}/${glossaryId}/terms/search?q=${encodeURIComponent(query)}`,
      { headers: getDefaultHeaders() }
    );
    return checkResponse(response);
  }

  // ---- Term Relations ----
  async addTermRelation(
    glossaryId: string,
    termId: string,
    relation: TermRelationUpsert
  ): Promise<Term> {
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms/${termId}/relations`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(relation),
    });
    return checkResponse(response);
  }

  async removeTermRelation(
    glossaryId: string,
    termId: string,
    relation: TermRelationUpsert
  ): Promise<Term> {
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms/${termId}/relations/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(relation),
    });
    return checkResponse(response);
  }

  // ---- Term Entity Assignments ----
  async assignEntityToTerm(
    glossaryId: string,
    termId: string,
    assignment: TermEntityAssignmentUpsert
  ): Promise<Term> {
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms/${termId}/entities`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(assignment),
    });
    return checkResponse(response);
  }

  async removeEntityFromTerm(
    glossaryId: string,
    termId: string,
    assignment: TermEntityAssignmentUpsert
  ): Promise<Term> {
    const response = await fetch(`${ENDPOINT}/${glossaryId}/terms/${termId}/entities/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(assignment),
    });
    return checkResponse(response);
  }

  // ---- Agent YAML ----
  async pullAllYaml(): Promise<string> {
    const response = await fetch(`${ENDPOINT}/all/yaml/agent-view`, {
      headers: { ...getDefaultHeaders(), Accept: "application/x-yaml" },
    });
    if (!response.ok) throw new Error(`Failed to pull YAML: ${response.statusText}`);
    return response.text();
  }

  async pullYamlByName(name: string): Promise<string> {
    const response = await fetch(`${ENDPOINT}/name/yaml/agent-view?name=${encodeURIComponent(name)}`, {
      headers: { ...getDefaultHeaders(), Accept: "application/x-yaml" },
    });
    if (!response.ok) throw new Error(`Failed to pull YAML: ${response.statusText}`);
    return response.text();
  }

  async pushYaml(yamlContent: string): Promise<void> {
    const response = await fetch(`${ENDPOINT}/yaml/agent-upsert`, {
      method: "POST",
      headers: { ...getDefaultHeaders(), "Content-Type": "application/x-yaml" },
      body: yamlContent,
    });
    if (!response.ok) throw new Error(`Failed to push YAML: ${response.statusText}`);
  }

  // ---- Mock store (for VITE_USE_MOCK_DATA) ----
  private mockBundles: GlossaryBundle[] = [];

  setMockStore(bundles: GlossaryBundle[]): void {
    this.mockBundles = bundles;
  }
}

export const businessGlossaryService = new BusinessGlossaryService();
