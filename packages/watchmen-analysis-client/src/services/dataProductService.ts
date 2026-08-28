import type {
  DataAssetCatalog,
  DataAssetCatalogUpsert,
  DataProduct,
  DataProductUpsert,
  BatchCreateRequest,
  BatchDeleteRequest,
  AssetMapResponse,
  ProductGraph,
  ProductGraphParams,
  SubjectOption,
  TopicDetails,
} from "@/model/dataProduct";
import { API_BASE_URL, getDefaultHeaders, checkResponse } from "@/utils/apiConfig";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === "true";

const ENDPOINT = `${API_BASE_URL}/metricflow/data-assets`;

export class DataProductService {
  // ---- Catalogs ----
  async listCatalogs(): Promise<DataAssetCatalog[]> {
    if (isMockMode) {
      await delay(200);
      return this.mockCatalogs;
    }
    const response = await fetch(`${ENDPOINT}/catalogs`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  async createCatalog(catalog: DataAssetCatalogUpsert): Promise<DataAssetCatalog> {
    if (isMockMode) {
      await delay(150);
      const created: DataAssetCatalog = {
        id: `mock-cat-${Date.now()}`,
        name: catalog.name,
        description: catalog.description,
        parent_id: catalog.parent_id,
        order_index: catalog.order_index || 0,
      };
      this.mockCatalogs.push(created);
      return created;
    }
    const response = await fetch(`${ENDPOINT}/catalogs`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(catalog),
    });
    return checkResponse(response);
  }

  async updateCatalog(catalog: DataAssetCatalogUpsert): Promise<DataAssetCatalog> {
    if (isMockMode) {
      await delay(150);
      const idx = this.mockCatalogs.findIndex((c) => c.id === catalog.id);
      if (idx >= 0) {
        this.mockCatalogs[idx] = { ...this.mockCatalogs[idx], ...catalog } as DataAssetCatalog;
        return this.mockCatalogs[idx];
      }
      throw new Error(`Catalog not found: ${catalog.id}`);
    }
    const response = await fetch(`${ENDPOINT}/catalogs/update`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(catalog),
    });
    return checkResponse(response);
  }

  async deleteCatalog(id: string): Promise<void> {
    if (isMockMode) {
      await delay(150);
      this.mockCatalogs = this.mockCatalogs.filter((c) => c.id !== id);
      return;
    }
    const response = await fetch(`${ENDPOINT}/catalogs/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({ id } as DataAssetCatalogUpsert),
    });
    await checkResponse(response);
  }

  // ---- Products ----
  async listProducts(params?: { catalogId?: string; q?: string }): Promise<DataProduct[]> {
    if (isMockMode) {
      await delay(200);
      let products = [...this.mockProducts];
      if (params?.catalogId) products = products.filter((p) => p.catalog_id === params.catalogId);
      if (params?.q) {
        const q = params.q.toLowerCase();
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.display_name && p.display_name.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.domain && p.domain.toLowerCase().includes(q))
        );
      }
      return products;
    }
    const search = new URLSearchParams();
    if (params?.catalogId) search.set("catalogId", params.catalogId);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    const response = await fetch(`${ENDPOINT}/products${qs ? `?${qs}` : ""}`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  async getProduct(id: string): Promise<DataProduct> {
    const response = await fetch(`${ENDPOINT}/products/${id}`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  async createProduct(product: DataProductUpsert): Promise<DataProduct> {
    if (isMockMode) {
      await delay(200);
      const created = {
        id: `mock-p-${Date.now()}`,
        visibility: "private",
        status: product.status || "draft",
        product_type: product.product_type || "dataset",
        categories: product.categories || [],
        standards: [],
        tags: product.tags || [],
        product_version: product.product_version || "1.0.0",
        output_formats: [],
        use_cases: [],
        recommended_data_products: [],
        pricing_plans: product.pricing_plans || [],
        input_ports: product.input_ports || [],
        output_ports: product.output_ports || [],
        supporting_elements: [],
        custom_properties: {},
        topic_ids: product.topic_ids || [],
        value_score: product.value_score || 0,
        ...product,
      } as DataProduct;
      this.mockProducts.push(created);
      return created;
    }
    const response = await fetch(`${ENDPOINT}/products`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(product),
    });
    return checkResponse(response);
  }

  async updateProduct(product: DataProductUpsert): Promise<DataProduct> {
    if (isMockMode) {
      await delay(200);
      const idx = this.mockProducts.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        this.mockProducts[idx] = { ...this.mockProducts[idx], ...product } as DataProduct;
        return this.mockProducts[idx];
      }
      throw new Error(`Product not found: ${product.id}`);
    }
    const response = await fetch(`${ENDPOINT}/products/update`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(product),
    });
    return checkResponse(response);
  }

  async deleteProduct(id: string): Promise<void> {
    if (isMockMode) {
      await delay(150);
      this.mockProducts = this.mockProducts.filter((p) => p.id !== id);
      return;
    }
    const response = await fetch(`${ENDPOINT}/products/delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({ id } as DataProductUpsert),
    });
    await checkResponse(response);
  }

  async batchDeleteProducts(ids: string[]): Promise<{ deleted: string[] }> {
    if (isMockMode) {
      await delay(150);
      this.mockProducts = this.mockProducts.filter((p) => !ids.includes(p.id));
      return { deleted: ids };
    }
    const response = await fetch(`${ENDPOINT}/products/batch-delete`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({ product_ids: ids } as BatchDeleteRequest),
    });
    return checkResponse(response);
  }

  async batchCreateProducts(request: BatchCreateRequest): Promise<DataProduct[]> {
    if (isMockMode) {
      await delay(300);
      const created = request.topic_ids.map((tid) => ({
        id: `mock-p-${Date.now()}-${tid}`,
        name: `topic-${tid}`,
        display_name: `topic-${tid}`,
        status: request.status || "draft",
        product_type: "dataset",
        visibility: "private",
        categories: [],
        standards: [],
        tags: [],
        product_version: "1.0.0",
        output_formats: [],
        use_cases: [],
        recommended_data_products: [],
        pricing_plans: [],
        input_ports: [],
        output_ports: [],
        supporting_elements: [],
        custom_properties: {},
        topic_ids: [tid],
        catalog_id: request.catalog_id,
        domain: request.domain,
        value_score: request.value_score || 0,
      })) as DataProduct[];
      this.mockProducts.push(...created);
      return created;
    }
    const response = await fetch(`${ENDPOINT}/products/batch-create`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify(request),
    });
    return checkResponse(response);
  }

  // ---- Table details ----
  async getTopicDetails(topicId: string): Promise<TopicDetails> {
    const response = await fetch(`${ENDPOINT}/topics/${topicId}/details`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  // ---- Subjects (for product association picker) ----
  async listSubjects(): Promise<SubjectOption[]> {
    if (isMockMode) {
      await delay(150);
      return [
        { subjectId: "mock-subject-1", name: "Order Analysis", description: "Order related analysis subjects" },
        { subjectId: "mock-subject-2", name: "Customer Profile", description: "Customer profile subjects" },
      ];
    }
    const response = await fetch(`${ENDPOINT}/subjects`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  // ---- Asset map ----
  async getAssetMap(): Promise<AssetMapResponse> {
    if (isMockMode) {
      await delay(300);
      // composite value score mirrors the backend formula: 70% auto + 30% manual
      const valueRanking = this.mockProducts.map((p) => {
        const manual = p.value_score ?? 0;
        const auto = Math.min(100, (p.topic_ids?.length ?? 0) * 25);
        return {
          product_id: p.id,
          name: p.name,
          display_name: p.display_name,
          catalog_id: p.catalog_id,
          value_score: manual,
          manual_score: manual,
          auto_score: auto,
          composite_score: Math.round(0.7 * auto + 0.3 * manual),
          metric_refs: 0,
          pipeline_refs: 0,
          topic_count: p.topic_ids?.length ?? 0,
          rows: 0,
        };
      });
      valueRanking.sort((a, b) => b.composite_score - a.composite_score || b.rows - a.rows);
      return {
        total_topics: new Set(this.mockProducts.flatMap((p) => p.topic_ids ?? [])).size,
        total_rows: 0,
        total_factors: 0,
        total_products: this.mockProducts.length,
        total_datasources: 0,
        total_catalogs: this.mockCatalogs.length,
        value_ranking: valueRanking.slice(0, 10),
        storage_ranking: [],
        inventory_ranking: this.mockCatalogs.map((c) => ({
          catalog_id: c.id,
          name: c.name,
          product_count: this.mockProducts.filter((p) => p.catalog_id === c.id).length,
        })),
        domain_ranking: [],
        storage_trend: [],
        topic_sizes: [],
        generated_at: new Date().toISOString(),
      };
    }
    const response = await fetch(`${ENDPOINT}/map`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  async takeSnapshot(): Promise<{ snapshotId: string; snapshotDate: string; totalRows: number }> {
    const response = await fetch(`${ENDPOINT}/map/snapshot`, {
      method: "POST",
      headers: getDefaultHeaders(),
      body: JSON.stringify({}),
    });
    return checkResponse(response);
  }

  // ---- ODPG product graph ----
  async getProductGraph(params: ProductGraphParams = {}): Promise<ProductGraph> {
    const search = new URLSearchParams();
    if (params.domain) search.set("domain", params.domain);
    if (params.q) search.set("q", params.q);
    if (params.focus) search.set("focus", params.focus);
    if (params.depth) search.set("depth", String(params.depth));
    const qs = search.toString();
    const response = await fetch(`${ENDPOINT}/graph/products${qs ? `?${qs}` : ""}`, {
      headers: getDefaultHeaders(),
    });
    return checkResponse(response);
  }

  async listSnapshots(): Promise<
    { snapshotId: string; snapshotDate: string; totalTopics: number; totalRows: number; totalFactors: number; productCount: number }[]
  > {
    const response = await fetch(`${ENDPOINT}/map/snapshots`, { headers: getDefaultHeaders() });
    return checkResponse(response);
  }

  // ---- Mock store ----
  private mockCatalogs: DataAssetCatalog[] = [];
  private mockProducts: DataProduct[] = [];
}

export const dataProductService = new DataProductService();
