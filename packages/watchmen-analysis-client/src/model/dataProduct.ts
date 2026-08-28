// ============================================================================
// Data Asset Model (Data Product / Catalog / Asset Map)
// Aligns with watchmen-metricflow backend data_product model and the
// Open Data Product Specification v4.1 (https://opendataproducts.org/v4.1/).
// ============================================================================

export type DataProductStatus =
  | 'announcement' | 'draft' | 'development' | 'testing'
  | 'acceptance' | 'production' | 'sunset' | 'retired';

export type DataProductVisibility = 'private' | 'invitation' | 'organisation' | 'dataspace' | 'public';

export type DataProductType = 'raw data' | 'derived data' | 'dataset' | 'reports' | 'analytic view' | 'application' | 'other';

export type PortfolioPriority = 'critical' | 'high' | 'medium' | 'low';

export type GovernanceProfile = 'structured' | 'enforced' | 'automated' | 'audit_ready';

export type PortType = 'topic' | 'sql' | 'api' | 'file' | 'ai' | 'other';

export type KpiDirection = 'ascending' | 'descending';

// ---------------------------------------------------------------------------
// ODPS schema (dataAccess schema)
// ---------------------------------------------------------------------------

export interface SchemaColumn {
  name: string;
  column_type?: string;
  description?: string;
  nullable: boolean;
  unique: boolean;
  primary_key: boolean;
}

export interface PortSchema {
  columns: SchemaColumn[];
}

// ---------------------------------------------------------------------------
// ODPS ports
// ---------------------------------------------------------------------------

export interface DataProductPort {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  port_type: PortType;
  format?: string;
  authentication_method?: string;
  specification?: string;
  access_url?: string;
  specs_url?: string;
  documentation_url?: string;
  topic_id?: string;
  topic_name?: string;
  schema?: PortSchema;
  tags: string[];
  custom_properties: Record<string, unknown>;
  status: DataProductStatus;
}

export interface SupportingElement {
  name: string;
  description?: string;
  path?: string;
  element_type?: string;
  element_id?: string;
  media_type?: string;
}

// ---------------------------------------------------------------------------
// ODPS strategy / KPI
// ---------------------------------------------------------------------------

export interface Kpi {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  target?: string | number;
  direction: KpiDirection;
  timeframe?: string;
  frequency?: string;
  calculation?: string;
}

export interface ProductStrategy {
  objectives: string[];
  contributes_to_kpi: string[];
  product_kpis: Kpi[];
  related_kpis: Kpi[];
  strategic_alignment?: string;
}

// ---------------------------------------------------------------------------
// ODPS contract / SLA / quality / pricing
// ---------------------------------------------------------------------------

export interface ProductContract {
  id: string;
  contract_type?: string;
  contract_version?: string;
  contract_url?: string;
  spec?: Record<string, unknown>;
}

export interface SlaDimension {
  dimension: string;
  objective?: string | number;
  unit?: string;
  weight?: number;
  description?: string;
}

export interface Sla {
  profile?: string;
  description?: string;
  support_hours?: string;
  dimensions: SlaDimension[];
}

export type DataQualityDimension = SlaDimension;

export interface DataQuality {
  profile?: string;
  description?: string;
  dimensions: DataQualityDimension[];
}

export interface PricingPlan {
  name: string;
  price_currency?: string;
  price?: string | number;
  unit?: string;
  billing_duration?: string;
  offering?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Catalog (custom directory)
// ---------------------------------------------------------------------------

export interface DataAssetCatalog {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  order_index: number;
}

export interface DataAssetCatalogUpsert {
  id?: string;
  name: string;
  description?: string;
  parent_id?: string;
  order_index: number;
}

// ---------------------------------------------------------------------------
// Data product (aggregate root)
// ---------------------------------------------------------------------------

export interface DataProduct {
  id: string;
  name: string;
  product_id?: string;
  display_name?: string;
  visibility: DataProductVisibility;
  status: DataProductStatus;
  product_type: DataProductType;
  value_proposition?: string;
  description?: string;
  categories: string[];
  standards: string[];
  tags: string[];
  product_version: string;
  portfolio_priority?: PortfolioPriority;
  governance_profile?: GovernanceProfile;
  version_notes?: string;
  logo_url?: string;
  output_formats: string[];
  use_cases: string[];
  recommended_data_products: string[];
  created_date?: string;
  updated_date?: string;
  owner?: string;
  owner_display_name?: string;
  product_manager?: string;
  maintainer?: string;
  domain?: string;
  product_strategy?: ProductStrategy;
  contract?: ProductContract;
  sla?: Sla;
  data_quality?: DataQuality;
  pricing_plans: PricingPlan[];
  license?: string;
  data_holder?: string;
  input_ports: DataProductPort[];
  output_ports: DataProductPort[];
  supporting_elements: SupportingElement[];
  custom_properties: Record<string, unknown>;
  catalog_id?: string;
  topic_ids: string[];
  metric_names: string[];
  metric_category_ids: string[];
  board_ids: string[];
  subject_ids: string[];
  ontology_ids: string[];
  value_score: number;
  tenantId?: string;
}

export interface DataProductUpsert {
  id?: string;
  name: string;
  display_name?: string;
  product_id?: string;
  visibility?: DataProductVisibility;
  status?: DataProductStatus;
  product_type?: DataProductType;
  value_proposition?: string;
  description?: string;
  categories?: string[];
  standards?: string[];
  tags?: string[];
  product_version?: string;
  portfolio_priority?: PortfolioPriority;
  governance_profile?: GovernanceProfile;
  version_notes?: string;
  logo_url?: string;
  output_formats?: string[];
  use_cases?: string[];
  recommended_data_products?: string[];
  owner?: string;
  owner_display_name?: string;
  product_manager?: string;
  maintainer?: string;
  domain?: string;
  product_strategy?: ProductStrategy;
  contract?: ProductContract;
  sla?: Sla;
  data_quality?: DataQuality;
  pricing_plans?: PricingPlan[];
  license?: string;
  data_holder?: string;
  input_ports?: DataProductPort[];
  output_ports?: DataProductPort[];
  supporting_elements?: SupportingElement[];
  custom_properties?: Record<string, unknown>;
  catalog_id?: string;
  topic_ids?: string[];
  metric_names?: string[];
  metric_category_ids?: string[];
  board_ids?: string[];
  subject_ids?: string[];
  ontology_ids?: string[];
  value_score?: number;
}

export interface SubjectOption {
  subjectId: string;
  name: string;
  description?: string;
}

export interface BatchCreateRequest {
  topic_ids: string[];
  catalog_id?: string;
  status?: DataProductStatus;
  domain?: string;
  value_score?: number;
}

export interface BatchDeleteRequest {
  product_ids: string[];
}

// ---------------------------------------------------------------------------
// Asset map
// ---------------------------------------------------------------------------

export interface TopicSize {
  topic_id: string;
  topic_name?: string;
  datasource_id?: string;
  rows: number;
  factors: number;
}

export interface ProductRank {
  product_id: string;
  name: string;
  display_name?: string;
  catalog_id?: string;
  /** manual score, human-assigned on the product */
  value_score: number;
  manual_score: number;
  auto_score: number;
  /** composite = 70% auto + 30% manual */
  composite_score: number;
  metric_refs: number;
  pipeline_refs: number;
  topic_count: number;
  rows: number;
}

export interface CatalogRank {
  catalog_id?: string;
  name: string;
  product_count: number;
}

export interface DomainRank {
  domain: string;
  product_count: number;
  rows: number;
}

export interface AssetSnapshot {
  id?: string;
  snapshot_date: string;
  total_topics: number;
  total_rows: number;
  total_factors: number;
  product_count: number;
  topic_sizes?: TopicSize[];
}

export interface AssetMapResponse {
  total_topics: number;
  total_rows: number;
  total_factors: number;
  total_products: number;
  total_datasources: number;
  total_catalogs: number;
  value_ranking: ProductRank[];
  storage_ranking: TopicSize[];
  inventory_ranking: CatalogRank[];
  domain_ranking: DomainRank[];
  storage_trend: AssetSnapshot[];
  topic_sizes: TopicSize[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Topic details (table details)
// ---------------------------------------------------------------------------

export interface TopicFactorDetail {
  name: string;
  label?: string;
  type: string;
  description?: string;
}

export interface TopicDetails {
  topicId: string;
  name: string;
  type: string;
  kind: string;
  dataSourceId?: string;
  description?: string;
  rows: number;
  factorCount: number;
  factors: TopicFactorDetail[];
  tags?: string[];
  lastModifiedAt?: string;
}
