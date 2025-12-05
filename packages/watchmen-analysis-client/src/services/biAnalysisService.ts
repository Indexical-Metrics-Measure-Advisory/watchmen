import { BIMetric, BICategory, BIChartType, BIAnalysis, BIAnalysisInput, BIAnalysisListItem, BIDimensionSelection, BIAnalysisTemplate } from '@/model/biAnalysis';
import { METRICS as CHAT_METRICS, generateMockData, TimeRange } from '@/services/chatMetricsService';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const BASE_URL = `${API_BASE_URL}/metricflow/bi-analysis`;

// ---- Categories (mock for now; plug API later) ----
const BI_CATEGORIES: BICategory[] = [
  { id: 'sales', name: 'Sales', description: 'Policy sales and related KPIs' },
  { id: 'risk', name: 'Risk & Approval', description: 'Loan approval and risk control' },
  { id: 'claims', name: 'Claims', description: 'Claims volume and amount' },
  { id: 'customer', name: 'Customer', description: 'Retention and customer KPIs' },
];

// ---- Metrics (derived from chat metrics with enriched fields) ----
const BI_METRICS: BIMetric[] = [
  { id: 'policy_sales', name: 'Policy Sales', description: 'Daily new policy count', categoryId: 'sales', kind: 'count', dimensions: ['Product Type', 'Region', 'Agent'] },
  { id: 'loan_approval', name: 'Loan Approval Rate', description: 'Loan application approval ratio', categoryId: 'risk', kind: 'rate', dimensions: ['Loan Type', 'Credit Score', 'Region'] },
  { id: 'claim_amount', name: 'Claim Amount', description: 'Total insurance claim amount', categoryId: 'claims', kind: 'amount', dimensions: ['Claim Type', 'Product Line', 'Region'] },
  { id: 'customer_retention', name: 'Customer Retention Rate', description: 'Customer renewal ratio', categoryId: 'customer', kind: 'rate', dimensions: ['Customer Segment', 'Product Type', 'Region'] },
];

export type MetricFilter = {
  searchTerm?: string;
  categoryId?: string;
};

export const getCategories = async (): Promise<BICategory[]> => {
  // TODO: integrate with backend when available
  return BI_CATEGORIES;
};

export const getMetrics = async (filter?: MetricFilter): Promise<BIMetric[]> => {
  let metrics = [...BI_METRICS];
  if (filter?.categoryId) metrics = metrics.filter(m => m.categoryId === filter.categoryId);
  if (filter?.searchTerm) {
    const q = filter.searchTerm.toLowerCase();
    metrics = metrics.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }
  return metrics;
};

// ---- Chart Recommendation ----
export const recommendChartType = (metric: BIMetric, selectedDims: string[]): BIChartType => {
  const dimCount = selectedDims.length;
  if (metric.kind === 'rate') {
    // rates trend well over time; single dimension -> line, multi -> stacked bar
    return dimCount <= 1 ? 'line' : 'stackedBar';
  }
  if (metric.kind === 'amount') {
    // amount often shown as bar; small categorical -> pie
    return dimCount === 0 ? 'line' : dimCount === 1 ? 'bar' : 'stackedBar';
  }
  // counts default: line for no dims, bar for 1 dim, stackedBar for >=2
  if (dimCount === 0) return 'line';
  if (dimCount === 1) return 'bar';
  return 'stackedBar';
};

// ---- Preview Data Generation ----
export type SeriesPoint = { date?: string; name?: string; value: number };

export const generatePreviewData = (metric: BIMetric, selection: BIDimensionSelection): SeriesPoint[] => {
  const timeRange = (selection.timeRange ?? 'Past 30 days') as TimeRange;
  // Use chat mock generator for time series base
  const series = generateMockData(metric.id as any, timeRange);

  // If categorical dimensions selected, synthesize category distribution for preview
  if (selection.dimensions.length > 0) {
    const categories = selection.dimensions.slice(0, 1); // preview uses first dimension as grouping
    const labels = sampleLabelsForDimension(categories[0]);
    return labels.map(label => ({ name: label, value: Math.round(Math.random() * 100) + 10 }));
  }

  return series.map(d => ({ date: d.date, value: d.value }));
};

const sampleLabelsForDimension = (dimension: string): string[] => {
  // Lightweight label synthesis; can be replaced by backend-provided domain values
  switch (dimension) {
    case 'Region':
      return ['North', 'South', 'East', 'West'];
    case 'Product Type':
      return ['Life', 'Health', 'Auto', 'Property'];
    case 'Agent':
      return ['A001', 'A002', 'A003', 'A004'];
    case 'Loan Type':
      return ['Mortgage', 'Personal', 'Auto'];
    case 'Credit Score':
      return ['Poor', 'Fair', 'Good', 'Excellent'];
    case 'Claim Type':
      return ['Theft', 'Accident', 'Fire', 'Flood'];
    case 'Product Line':
      return ['Retail', 'SME', 'Corporate'];
    case 'Customer Segment':
      return ['New', 'Returning', 'VIP'];
    default:
      return ['Category A', 'Category B', 'Category C'];
  }
};

// ---- Persistence (localStorage-backed, API-ready) ----
const STORAGE_KEY = 'bi_analyses';

const readStore = (): BIAnalysis[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BIAnalysis[];
  } catch {
    return [];
  }
};

const writeStore = (items: BIAnalysis[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const saveAnalysis = async (input: BIAnalysis): Promise<BIAnalysis> => {
  if (isMockMode) {
    const now = new Date().toISOString();
    const id = `bi_${Date.now()}`;
    const record: BIAnalysis = { 
      id, 
      userId: input.userId,
      name: input.name, 
      description: input.description, 
      cards: input.cards,
      isTemplate: input.isTemplate 
    };
    const all = readStore();
    writeStore([record, ...all]);
    return record;
  }

  const response = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: getDefaultHeaders(),
    body: JSON.stringify(input),
  });
  return checkResponse(response);
};

export const listAnalyses = async (): Promise<BIAnalysisListItem[]> => {
  if (isMockMode) {
    const all = readStore();
    return all.map(a => ({ 
      id: a.id, 
      name: a.name, 
      description: a.description, 
      cardCount: a.cards.length,
      isTemplate: a.isTemplate 
    }));
  }

  const response = await fetch(`${BASE_URL}/all`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });
  return checkResponse(response);
};

export const getAnalysis = async (id: string): Promise<BIAnalysis | undefined> => {
  if (isMockMode) {
    const all = readStore();
    return all.find(a => a.id === id);
  }

  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'GET',
    headers: getDefaultHeaders(),
  });
  // Handle 404 or other errors gracefully if needed, but checkResponse throws on error
  // For undefined return type, we might need to catch 404 specifically if backend returns 404
  try {
    return await checkResponse(response);
  } catch (e) {
    console.error("Failed to fetch analysis", e);
    return undefined;
  }
};

export const updateAnalysis = async (update: BIAnalysis): Promise<BIAnalysis | undefined> => {
 

  console.log('update', update);

  const response = await fetch(`${BASE_URL}/update`, {
    method: 'POST', // Using POST for update as well, or could be PUT/PATCH
    headers: getDefaultHeaders(),
    body: JSON.stringify(update),
  });
  return checkResponse(response);
};

export const deleteAnalysis = async (id: string): Promise<boolean> => {
  if (isMockMode) {
    const all = readStore();
    const next = all.filter(a => a.id !== id);
    writeStore(next);
    return all.length !== next.length;
  }

  const response = await fetch(`${BASE_URL}/delete/${id}`, {
    method: 'GET', // Following getAnalysis style or specific backend requirement
    headers: getDefaultHeaders(),
  });
  await checkResponse(response);
  return true;




};
export const updateAnalysisTemplate = async (update: BIAnalysisTemplate): Promise<BIAnalysis | undefined> => {
  
  const response = await fetch(`${BASE_URL}/update/template`, {
    method: 'POST', // Using POST for update as well, or could be PUT/PATCH
    headers: getDefaultHeaders(),
    body: JSON.stringify(update),
  });
  return checkResponse(response);
};

