import type { MetricLineageViewData } from '@/model/metricLineage';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const LINEAGE_BASE_URL = `${API_BASE_URL}/metricflow/metrics/lineage`;
const METRICS_BASE_URL = `${API_BASE_URL}/metricflow/metrics/all`;

const cloneMetricLineageViewData = (data: MetricLineageViewData): MetricLineageViewData => (
  JSON.parse(JSON.stringify(data)) as MetricLineageViewData
);

const mockLineageMap: Record<string, MetricLineageViewData> = {
  total_claim_cases: {
    metricName: 'total_claim_cases',
    status: 'resolved',
    summary: {
      metricType: 'simple',
      semanticModelCount: 1,
      topicCount: 1,
      pipelineCount: 1,
      sourceFieldCount: 2,
    },
    nodes: [
      {
        id: 'metric-total-claim-cases',
        stage: 'metric',
        type: 'metric',
        name: 'total_claim_cases',
        label: 'Total Claim Cases',
        badge: 'simple',
        description: 'Business metric tracking the total number of claim cases.',
        metadata: { expression: 'count(claim_id)', owner: 'Claims Analytics' },
      },
      {
        id: 'semantic-claims-model',
        stage: 'semantic',
        type: 'semantic_model',
        name: 'claims_semantic_model',
        label: 'Claims Semantic Model',
        badge: 'semantic model',
        description: 'Semantic layer that standardizes core claims measures and dimensions.',
        metadata: { topicId: 'claims_topic', relationName: 'mart_claims_summary' },
      },
      {
        id: 'semantic-measure-claim-count',
        stage: 'semantic',
        type: 'semantic_measure',
        name: 'claim_count',
        label: 'Claim Count',
        badge: 'measure',
        description: 'Measure generated from claim identifiers.',
        metadata: { expr: 'claim_id', agg: 'count_distinct' },
      },
      {
        id: 'topic-claims',
        stage: 'topic',
        type: 'topic',
        name: 'claims_topic',
        label: 'Claims Topic',
        badge: 'topic',
        description: 'Datamart topic representing the claim domain.',
        metadata: { classification: 'dm', factors: 14 },
      },
      {
        id: 'topic-factor-claim-id',
        stage: 'topic',
        type: 'topic_factor',
        name: 'claim_id',
        label: 'Claim Identifier',
        badge: 'factor',
        description: 'Unique identifier factor used to count claims.',
        metadata: { type: 'sequence', sourceColumn: 'claim_id' },
      },
      {
        id: 'pipeline-claims-ingestion',
        stage: 'pipeline',
        type: 'pipeline',
        name: 'claims_ingestion_pipeline',
        label: 'Claims Ingestion Pipeline',
        badge: 'batch',
        description: 'Pipeline responsible for landing and transforming raw claim events.',
        metadata: { schedule: 'hourly', owner: 'Data Platform' },
      },
      {
        id: 'source-table-claim-header',
        stage: 'source',
        type: 'source_table',
        name: 'ods_claim.claim_header',
        label: 'claim_header',
        badge: 'table',
        description: 'Operational claim header table.',
        metadata: { database: 'ods_claim', schema: 'public' },
      },
      {
        id: 'source-field-claim-id',
        stage: 'source',
        type: 'source_field',
        name: 'claim_id',
        label: 'claim_id',
        badge: 'field',
        description: 'Raw claim identifier column used in aggregation.',
        metadata: { dataType: 'varchar', nullable: false },
      },
      {
        id: 'source-field-claim-number',
        stage: 'source',
        type: 'source_field',
        name: 'claim_number',
        label: 'claim_number',
        badge: 'field',
        description: 'Business-facing claim number kept for reconciliation.',
        metadata: { dataType: 'varchar', nullable: false },
      },
    ],
    edges: [
      { id: 'e1', from: 'metric-total-claim-cases', to: 'semantic-claims-model', kind: 'defines', pathId: 'path-primary' },
      { id: 'e2', from: 'semantic-claims-model', to: 'semantic-measure-claim-count', kind: 'defines', pathId: 'path-primary' },
      { id: 'e3', from: 'semantic-measure-claim-count', to: 'topic-claims', kind: 'maps_to', pathId: 'path-primary' },
      { id: 'e4', from: 'topic-claims', to: 'topic-factor-claim-id', kind: 'maps_to', pathId: 'path-primary' },
      { id: 'e5', from: 'topic-factor-claim-id', to: 'pipeline-claims-ingestion', kind: 'reads_from', pathId: 'path-primary' },
      { id: 'e6', from: 'pipeline-claims-ingestion', to: 'source-table-claim-header', kind: 'produces', pathId: 'path-primary' },
      { id: 'e7', from: 'source-table-claim-header', to: 'source-field-claim-id', kind: 'maps_to', pathId: 'path-primary' },
      { id: 'e8', from: 'source-table-claim-header', to: 'source-field-claim-number', kind: 'maps_to', pathId: 'path-primary' },
    ],
    paths: [
      {
        id: 'path-primary',
        title: 'Primary lineage path',
        nodeIds: [
          'metric-total-claim-cases',
          'semantic-claims-model',
          'semantic-measure-claim-count',
          'topic-claims',
          'topic-factor-claim-id',
          'pipeline-claims-ingestion',
          'source-table-claim-header',
          'source-field-claim-id',
        ],
        isPrimary: true,
      },
    ],
    diagnostics: ['Resolved end-to-end using mock data.', 'Source fields are displayed as pipeline outputs.'],
  },
  loss_ratio: {
    metricName: 'loss_ratio',
    status: 'resolved',
    summary: {
      metricType: 'ratio',
      semanticModelCount: 2,
      topicCount: 2,
      pipelineCount: 2,
      sourceFieldCount: 3,
    },
    nodes: [
      {
        id: 'metric-loss-ratio',
        stage: 'metric',
        type: 'metric',
        name: 'loss_ratio',
        label: 'Loss Ratio',
        badge: 'ratio',
        description: 'Claims paid amount divided by earned premium.',
        metadata: { numerator: 'claims_paid_amount', denominator: 'earned_premium_amount' },
      },
      {
        id: 'metric-ref-claims-paid',
        stage: 'metric',
        type: 'metric_ref',
        name: 'claims_paid_amount',
        label: 'Claims Paid Amount',
        badge: 'numerator',
        description: 'Metric reference used as the numerator path.',
      },
      {
        id: 'metric-ref-earned-premium',
        stage: 'metric',
        type: 'metric_ref',
        name: 'earned_premium_amount',
        label: 'Earned Premium Amount',
        badge: 'denominator',
        description: 'Metric reference used as the denominator path.',
      },
      {
        id: 'semantic-claims-finance',
        stage: 'semantic',
        type: 'semantic_model',
        name: 'claims_finance_model',
        label: 'Claims Finance Model',
        badge: 'semantic model',
        description: 'Finance model for claim settlement amounts.',
      },
      {
        id: 'semantic-premium-model',
        stage: 'semantic',
        type: 'semantic_model',
        name: 'premium_finance_model',
        label: 'Premium Finance Model',
        badge: 'semantic model',
        description: 'Finance model for earned premium calculations.',
      },
      {
        id: 'topic-claims-finance',
        stage: 'topic',
        type: 'topic',
        name: 'claims_finance_topic',
        label: 'Claims Finance Topic',
        badge: 'topic',
      },
      {
        id: 'topic-premium-finance',
        stage: 'topic',
        type: 'topic',
        name: 'premium_finance_topic',
        label: 'Premium Finance Topic',
        badge: 'topic',
      },
      {
        id: 'pipeline-claims-finance',
        stage: 'pipeline',
        type: 'pipeline',
        name: 'claims_finance_pipeline',
        label: 'Claims Finance Pipeline',
        badge: 'batch',
      },
      {
        id: 'pipeline-premium-finance',
        stage: 'pipeline',
        type: 'pipeline',
        name: 'premium_finance_pipeline',
        label: 'Premium Finance Pipeline',
        badge: 'batch',
      },
      {
        id: 'source-field-paid-amount',
        stage: 'source',
        type: 'source_field',
        name: 'paid_amount',
        label: 'paid_amount',
        badge: 'field',
      },
      {
        id: 'source-field-earned-premium',
        stage: 'source',
        type: 'source_field',
        name: 'earned_premium',
        label: 'earned_premium',
        badge: 'field',
      },
      {
        id: 'source-field-policy-term',
        stage: 'source',
        type: 'source_field',
        name: 'policy_term_days',
        label: 'policy_term_days',
        badge: 'field',
      },
    ],
    edges: [
      { id: 'e1', from: 'metric-loss-ratio', to: 'metric-ref-claims-paid', kind: 'derived_from', pathId: 'path-numerator' },
      { id: 'e2', from: 'metric-loss-ratio', to: 'metric-ref-earned-premium', kind: 'derived_from', pathId: 'path-denominator' },
      { id: 'e3', from: 'metric-ref-claims-paid', to: 'semantic-claims-finance', kind: 'defines', pathId: 'path-numerator' },
      { id: 'e4', from: 'metric-ref-earned-premium', to: 'semantic-premium-model', kind: 'defines', pathId: 'path-denominator' },
      { id: 'e5', from: 'semantic-claims-finance', to: 'topic-claims-finance', kind: 'maps_to', pathId: 'path-numerator' },
      { id: 'e6', from: 'semantic-premium-model', to: 'topic-premium-finance', kind: 'maps_to', pathId: 'path-denominator' },
      { id: 'e7', from: 'topic-claims-finance', to: 'pipeline-claims-finance', kind: 'reads_from', pathId: 'path-numerator' },
      { id: 'e8', from: 'topic-premium-finance', to: 'pipeline-premium-finance', kind: 'reads_from', pathId: 'path-denominator' },
      { id: 'e9', from: 'pipeline-claims-finance', to: 'source-field-paid-amount', kind: 'maps_to', pathId: 'path-numerator' },
      { id: 'e10', from: 'pipeline-premium-finance', to: 'source-field-earned-premium', kind: 'maps_to', pathId: 'path-denominator' },
      { id: 'e11', from: 'pipeline-premium-finance', to: 'source-field-policy-term', kind: 'maps_to', pathId: 'path-denominator' },
    ],
    paths: [
      {
        id: 'path-numerator',
        title: 'Numerator lineage',
        nodeIds: ['metric-loss-ratio', 'metric-ref-claims-paid', 'semantic-claims-finance', 'topic-claims-finance', 'pipeline-claims-finance', 'source-field-paid-amount'],
        isPrimary: true,
      },
      {
        id: 'path-denominator',
        title: 'Denominator lineage',
        nodeIds: ['metric-loss-ratio', 'metric-ref-earned-premium', 'semantic-premium-model', 'topic-premium-finance', 'pipeline-premium-finance', 'source-field-earned-premium'],
      },
    ],
    diagnostics: ['This mock illustrates branching lineage for ratio metrics.'],
  },
  claim_risk_score: {
    metricName: 'claim_risk_score',
    status: 'partial',
    summary: {
      metricType: 'derived',
      semanticModelCount: 1,
      topicCount: 1,
      pipelineCount: 0,
      sourceFieldCount: 0,
    },
    nodes: [
      {
        id: 'metric-claim-risk-score',
        stage: 'metric',
        type: 'metric',
        name: 'claim_risk_score',
        label: 'Claim Risk Score',
        badge: 'derived',
        description: 'Composite score derived from frequency, severity, and fraud indicators.',
      },
      {
        id: 'semantic-risk-model',
        stage: 'semantic',
        type: 'semantic_model',
        name: 'risk_scoring_model',
        label: 'Risk Scoring Model',
        badge: 'semantic model',
      },
      {
        id: 'topic-risk',
        stage: 'topic',
        type: 'topic',
        name: 'risk_scoring_topic',
        label: 'Risk Scoring Topic',
        badge: 'topic',
      },
    ],
    edges: [
      { id: 'e1', from: 'metric-claim-risk-score', to: 'semantic-risk-model', kind: 'defines', pathId: 'path-risk' },
      { id: 'e2', from: 'semantic-risk-model', to: 'topic-risk', kind: 'maps_to', pathId: 'path-risk' },
    ],
    paths: [
      {
        id: 'path-risk',
        title: 'Partial lineage path',
        nodeIds: ['metric-claim-risk-score', 'semantic-risk-model', 'topic-risk'],
        isPrimary: true,
      },
    ],
    diagnostics: ['Pipeline and source field details are intentionally unresolved in this mock scenario.'],
  },
  underwriting_margin: {
    metricName: 'underwriting_margin',
    status: 'resolved',
    summary: {
      metricType: 'derived',
      semanticModelCount: 2,
      topicCount: 2,
      pipelineCount: 2,
      sourceFieldCount: 4,
    },
    nodes: [
      {
        id: 'metric-underwriting-margin',
        stage: 'metric',
        type: 'metric',
        name: 'underwriting_margin',
        label: 'Underwriting Margin',
        badge: 'derived',
        description: 'Margin metric subtracting claim costs and operating expenses from earned premium.',
        metadata: { formula: 'earned_premium - claims_paid - operating_expense', owner: 'Insurance Finance' },
      },
      {
        id: 'metric-ref-earned-premium-margin',
        stage: 'metric',
        type: 'metric_ref',
        name: 'earned_premium_amount',
        label: 'Earned Premium Amount',
        badge: 'revenue',
        description: 'Revenue-side metric reference feeding underwriting margin.',
      },
      {
        id: 'metric-ref-claims-cost-margin',
        stage: 'metric',
        type: 'metric_ref',
        name: 'claims_paid_amount',
        label: 'Claims Paid Amount',
        badge: 'cost',
        description: 'Claims cost metric reference used in the margin calculation.',
      },
      {
        id: 'semantic-margin-revenue',
        stage: 'semantic',
        type: 'semantic_model',
        name: 'premium_margin_model',
        label: 'Premium Margin Model',
        badge: 'semantic model',
        description: 'Semantic model governing premium revenue measures.',
      },
      {
        id: 'semantic-margin-claims',
        stage: 'semantic',
        type: 'semantic_model',
        name: 'claims_margin_model',
        label: 'Claims Margin Model',
        badge: 'semantic model',
        description: 'Semantic model governing claim and expense measures.',
      },
      {
        id: 'topic-margin-premium',
        stage: 'topic',
        type: 'topic',
        name: 'premium_margin_topic',
        label: 'Premium Margin Topic',
        badge: 'topic',
        description: 'Topic carrying earned premium facts for margin reporting.',
      },
      {
        id: 'topic-margin-claims',
        stage: 'topic',
        type: 'topic',
        name: 'claims_margin_topic',
        label: 'Claims Margin Topic',
        badge: 'topic',
        description: 'Topic carrying claims paid and expense facts for margin reporting.',
      },
      {
        id: 'pipeline-margin-premium',
        stage: 'pipeline',
        type: 'pipeline',
        name: 'premium_margin_pipeline',
        label: 'Premium Margin Pipeline',
        badge: 'hourly',
        description: 'Transforms policy transactions into earned premium mart tables.',
      },
      {
        id: 'pipeline-margin-claims',
        stage: 'pipeline',
        type: 'pipeline',
        name: 'claims_margin_pipeline',
        label: 'Claims Margin Pipeline',
        badge: 'hourly',
        description: 'Normalizes claims and expense transactions into margin-ready facts.',
      },
      {
        id: 'source-table-policy-ledger',
        stage: 'source',
        type: 'source_table',
        name: 'fin_policy.policy_ledger',
        label: 'policy_ledger',
        badge: 'table',
        description: 'Policy financial ledger containing earned premium transactions.',
      },
      {
        id: 'source-table-claims-ledger',
        stage: 'source',
        type: 'source_table',
        name: 'fin_claims.claims_ledger',
        label: 'claims_ledger',
        badge: 'table',
        description: 'Claims financial ledger containing paid loss and expense transactions.',
      },
      {
        id: 'source-field-earned-premium-margin',
        stage: 'source',
        type: 'source_field',
        name: 'earned_premium_amount',
        label: 'earned_premium_amount',
        badge: 'field',
        description: 'Ledger column used to compute earned premium.',
      },
      {
        id: 'source-field-paid-loss-margin',
        stage: 'source',
        type: 'source_field',
        name: 'paid_loss_amount',
        label: 'paid_loss_amount',
        badge: 'field',
        description: 'Ledger column representing settled loss amount.',
      },
      {
        id: 'source-field-adjusting-expense-margin',
        stage: 'source',
        type: 'source_field',
        name: 'adjusting_expense_amount',
        label: 'adjusting_expense_amount',
        badge: 'field',
        description: 'Ledger column representing allocated expense amount.',
      },
      {
        id: 'source-field-policy-status-margin',
        stage: 'source',
        type: 'source_field',
        name: 'policy_status',
        label: 'policy_status',
        badge: 'field',
        description: 'Operational status field used to filter active policies.',
      },
    ],
    edges: [
      { id: 'e1', from: 'metric-underwriting-margin', to: 'metric-ref-earned-premium-margin', kind: 'derived_from', pathId: 'path-margin-premium' },
      { id: 'e2', from: 'metric-underwriting-margin', to: 'metric-ref-claims-cost-margin', kind: 'derived_from', pathId: 'path-margin-claims' },
      { id: 'e3', from: 'metric-ref-earned-premium-margin', to: 'semantic-margin-revenue', kind: 'defines', pathId: 'path-margin-premium' },
      { id: 'e4', from: 'metric-ref-claims-cost-margin', to: 'semantic-margin-claims', kind: 'defines', pathId: 'path-margin-claims' },
      { id: 'e5', from: 'semantic-margin-revenue', to: 'topic-margin-premium', kind: 'maps_to', pathId: 'path-margin-premium' },
      { id: 'e6', from: 'semantic-margin-claims', to: 'topic-margin-claims', kind: 'maps_to', pathId: 'path-margin-claims' },
      { id: 'e7', from: 'topic-margin-premium', to: 'pipeline-margin-premium', kind: 'reads_from', pathId: 'path-margin-premium' },
      { id: 'e8', from: 'topic-margin-claims', to: 'pipeline-margin-claims', kind: 'reads_from', pathId: 'path-margin-claims' },
      { id: 'e9', from: 'pipeline-margin-premium', to: 'source-table-policy-ledger', kind: 'produces', pathId: 'path-margin-premium' },
      { id: 'e10', from: 'pipeline-margin-claims', to: 'source-table-claims-ledger', kind: 'produces', pathId: 'path-margin-claims' },
      { id: 'e11', from: 'source-table-policy-ledger', to: 'source-field-earned-premium-margin', kind: 'maps_to', pathId: 'path-margin-premium' },
      { id: 'e12', from: 'source-table-policy-ledger', to: 'source-field-policy-status-margin', kind: 'maps_to', pathId: 'path-margin-premium' },
      { id: 'e13', from: 'source-table-claims-ledger', to: 'source-field-paid-loss-margin', kind: 'maps_to', pathId: 'path-margin-claims' },
      { id: 'e14', from: 'source-table-claims-ledger', to: 'source-field-adjusting-expense-margin', kind: 'maps_to', pathId: 'path-margin-claims' },
    ],
    paths: [
      {
        id: 'path-margin-premium',
        title: 'Revenue contribution path',
        nodeIds: [
          'metric-underwriting-margin',
          'metric-ref-earned-premium-margin',
          'semantic-margin-revenue',
          'topic-margin-premium',
          'pipeline-margin-premium',
          'source-table-policy-ledger',
          'source-field-earned-premium-margin',
        ],
        isPrimary: true,
      },
      {
        id: 'path-margin-claims',
        title: 'Claims and expense contribution path',
        nodeIds: [
          'metric-underwriting-margin',
          'metric-ref-claims-cost-margin',
          'semantic-margin-claims',
          'topic-margin-claims',
          'pipeline-margin-claims',
          'source-table-claims-ledger',
          'source-field-paid-loss-margin',
        ],
      },
    ],
    diagnostics: [
      'This mock demonstrates multi-topic contribution into a derived finance metric.',
      'Source tables are surfaced alongside fields to make pipeline outputs easier to review.',
    ],
  },
};

const getMetricLineageMockSuggestions = (): string[] => Object.keys(mockLineageMap);

const getMetricLineageSuggestionsFromApi = async (): Promise<string[]> => {
  const response = await fetch(METRICS_BASE_URL, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });

  const data = await checkResponse(response);
  const metrics = Array.isArray(data) ? data : data?.metrics;

  if (!Array.isArray(metrics)) {
    return [];
  }

  return metrics
    .map(metric => typeof metric?.name === 'string' ? metric.name : null)
    .filter((name): name is string => !!name)
    .slice(0, 8);
};

const getMetricLineageMock = async (metricName: string): Promise<MetricLineageViewData> => {
  await delay(450);
  const normalized = metricName.trim().toLowerCase();
  const match = mockLineageMap[normalized];
  if (match) return cloneMetricLineageViewData(match);

  return {
    metricName: metricName.trim(),
    status: 'unresolved',
    summary: {
      metricType: 'unknown',
      semanticModelCount: 0,
      topicCount: 0,
      pipelineCount: 0,
      sourceFieldCount: 0,
    },
    nodes: [],
    edges: [],
    paths: [],
    diagnostics: [
      `No lineage mock was found for "${metricName.trim()}".`,
      'Try one of the suggested metric names to preview the designed experience.',
    ],
  };
};

const getMetricLineageFromApi = async (metricName: string): Promise<MetricLineageViewData> => {
  const response = await fetch(`${LINEAGE_BASE_URL}?metric=${encodeURIComponent(metricName)}`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });

  const data = await checkResponse(response);
  return data as MetricLineageViewData;
};

type MetricLineageDataSource = 'api' | 'mock';

class MetricLineageService {
  constructor(private readonly dataSource: MetricLineageDataSource = 'api') {}

  async getLineage(metricName: string): Promise<MetricLineageViewData> {
    switch (this.dataSource) {
      case 'api':
        try {
          return await getMetricLineageFromApi(metricName);
        } catch (error) {
          console.warn('Failed to fetch metric lineage from API, fallback to mock data.', error);
          return getMetricLineageMock(metricName);
        }
      case 'mock':
      default:
        return getMetricLineageMock(metricName);
    }
  }

  async getSuggestions(): Promise<string[]> {
    switch (this.dataSource) {
      case 'api':
        try {
          const suggestions = await getMetricLineageSuggestionsFromApi();
          return suggestions.length > 0 ? suggestions : getMetricLineageMockSuggestions();
        } catch (error) {
          console.warn('Failed to fetch metric lineage suggestions from API, fallback to mock data.', error);
          return getMetricLineageMockSuggestions();
        }
      case 'mock':
      default:
        return getMetricLineageMockSuggestions();
    }
  }
}

export const metricLineageService = new MetricLineageService();

export const getMetricLineage = async (metricName: string): Promise<MetricLineageViewData> => (
  metricLineageService.getLineage(metricName)
);

export const getMetricLineageSuggestions = async (): Promise<string[]> => metricLineageService.getSuggestions();
