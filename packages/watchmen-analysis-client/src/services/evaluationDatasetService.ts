// Evaluation Dataset Management Service
// Provides CRUD operations for LLM evaluation datasets

export interface EvaluationDataset {
  id: string;
  name: string;
  description: string;
  type: 'training' | 'validation' | 'test' | 'benchmark';
  format: 'json' | 'csv' | 'jsonl' | 'parquet';
  size: number; // Number of records
  fileSize: string; // File size in human readable format
  tags: string[];
  metadata: {
    domain: string;
    language: string;
    version: string;
    source: string;
    quality: 'high' | 'medium' | 'low';
    lastValidated?: string;
  };
  schema: {
    inputFields: string[];
    outputFields: string[];
    requiredFields: string[];
  };
  status: 'active' | 'archived' | 'processing' | 'error';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  filePath?: string;
  downloadUrl?: string;
}

export interface DatasetFilter {
  type?: string;
  format?: string;
  status?: string;
  tags?: string[];
  domain?: string;
  quality?: string;
  search?: string;
}

export interface DatasetSummary {
  total: number;
  byType: Record<string, number>;
  byFormat: Record<string, number>;
  byStatus: Record<string, number>;
  totalSize: number;
  lastUpdated: string;
}

// Mock datasets data
const mockDatasets: EvaluationDataset[] = [
  {
    id: 'ds-001',
    name: 'Insurance Claims Q&A Dataset',
    description: 'Comprehensive dataset for insurance claims question-answering tasks',
    type: 'training',
    format: 'jsonl',
    size: 15000,
    fileSize: '45.2 MB',
    tags: ['insurance', 'claims', 'qa', 'customer-service'],
    metadata: {
      domain: 'insurance',
      language: 'en',
      version: '2.1',
      source: 'internal',
      quality: 'high',
      lastValidated: '2024-01-15T10:30:00Z'
    },
    schema: {
      inputFields: ['question', 'context', 'claim_type'],
      outputFields: ['answer', 'confidence', 'reasoning'],
      requiredFields: ['question', 'answer']
    },
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    createdBy: 'admin@company.com',
    filePath: '/datasets/insurance_claims_qa_v2.1.jsonl',
    downloadUrl: '/api/datasets/ds-001/download'
  },
  {
    id: 'ds-002',
    name: 'Policy Recommendation Test Set',
    description: 'Test dataset for policy recommendation system evaluation',
    type: 'test',
    format: 'json',
    size: 3500,
    fileSize: '12.8 MB',
    tags: ['policy', 'recommendation', 'personalization'],
    metadata: {
      domain: 'insurance',
      language: 'en',
      version: '1.3',
      source: 'synthetic',
      quality: 'high'
    },
    schema: {
      inputFields: ['customer_profile', 'preferences', 'history'],
      outputFields: ['recommended_policies', 'scores', 'explanations'],
      requiredFields: ['customer_profile', 'recommended_policies']
    },
    status: 'active',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T14:20:00Z',
    createdBy: 'data-team@company.com',
    filePath: '/datasets/policy_recommendation_test_v1.3.json',
    downloadUrl: '/api/datasets/ds-002/download'
  },
  {
    id: 'ds-003',
    name: 'Risk Assessment Validation Dataset',
    description: 'Validation dataset for risk assessment model performance',
    type: 'validation',
    format: 'csv',
    size: 8200,
    fileSize: '28.5 MB',
    tags: ['risk-assessment', 'validation', 'underwriting'],
    metadata: {
      domain: 'insurance',
      language: 'en',
      version: '1.0',
      source: 'external',
      quality: 'medium'
    },
    schema: {
      inputFields: ['applicant_data', 'financial_info', 'medical_history'],
      outputFields: ['risk_score', 'risk_category', 'factors'],
      requiredFields: ['applicant_data', 'risk_score']
    },
    status: 'active',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-12T09:15:00Z',
    createdBy: 'ml-team@company.com',
    filePath: '/datasets/risk_assessment_validation_v1.0.csv',
    downloadUrl: '/api/datasets/ds-003/download'
  },
  {
    id: 'ds-004',
    name: 'Customer Support Benchmark',
    description: 'Benchmark dataset for customer support chatbot evaluation',
    type: 'benchmark',
    format: 'jsonl',
    size: 5000,
    fileSize: '18.7 MB',
    tags: ['customer-support', 'chatbot', 'benchmark', 'conversation'],
    metadata: {
      domain: 'customer-service',
      language: 'en',
      version: '2.0',
      source: 'curated',
      quality: 'high',
      lastValidated: '2024-01-20T16:45:00Z'
    },
    schema: {
      inputFields: ['user_message', 'conversation_history', 'intent'],
      outputFields: ['bot_response', 'action', 'confidence'],
      requiredFields: ['user_message', 'bot_response']
    },
    status: 'active',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-20T16:45:00Z',
    createdBy: 'ai-team@company.com',
    filePath: '/datasets/customer_support_benchmark_v2.0.jsonl',
    downloadUrl: '/api/datasets/ds-004/download'
  },
  {
    id: 'ds-005',
    name: 'Legacy Claims Processing Dataset',
    description: 'Historical dataset for claims processing automation',
    type: 'training',
    format: 'parquet',
    size: 25000,
    fileSize: '95.3 MB',
    tags: ['claims', 'processing', 'automation', 'legacy'],
    metadata: {
      domain: 'insurance',
      language: 'en',
      version: '1.5',
      source: 'legacy-system',
      quality: 'medium'
    },
    schema: {
      inputFields: ['claim_details', 'documents', 'policy_info'],
      outputFields: ['processing_decision', 'amount', 'notes'],
      requiredFields: ['claim_details', 'processing_decision']
    },
    status: 'archived',
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-05T11:30:00Z',
    createdBy: 'legacy-migration@company.com',
    filePath: '/datasets/legacy_claims_processing_v1.5.parquet'
  }
];

// Utility function to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get all datasets with optional filtering
export const getDatasets = async (filter?: DatasetFilter): Promise<EvaluationDataset[]> => {
  await delay(300);
  
  let filteredDatasets = [...mockDatasets];
  
  if (filter) {
    if (filter.type && filter.type !== 'all') {
      filteredDatasets = filteredDatasets.filter(d => d.type === filter.type);
    }
    if (filter.format && filter.format !== 'all') {
      filteredDatasets = filteredDatasets.filter(d => d.format === filter.format);
    }
    if (filter.status && filter.status !== 'all') {
      filteredDatasets = filteredDatasets.filter(d => d.status === filter.status);
    }
    if (filter.tags && filter.tags.length > 0) {
      filteredDatasets = filteredDatasets.filter(d => 
        filter.tags!.some(tag => d.tags.includes(tag))
      );
    }
    if (filter.domain) {
      filteredDatasets = filteredDatasets.filter(d => d.metadata.domain === filter.domain);
    }
    if (filter.quality) {
      filteredDatasets = filteredDatasets.filter(d => d.metadata.quality === filter.quality);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredDatasets = filteredDatasets.filter(d => 
        d.name.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower) ||
        d.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
  }
  
  return filteredDatasets;
};

// Get dataset summary statistics
export const getDatasetSummary = async (): Promise<DatasetSummary> => {
  await delay(200);
  
  const datasets = await getDatasets();
  
  const byType = datasets.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byFormat = datasets.reduce((acc, d) => {
    acc[d.format] = (acc[d.format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byStatus = datasets.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalSize = datasets.reduce((acc, d) => acc + d.size, 0);
  const lastUpdated = datasets.reduce((latest, d) => 
    d.updatedAt > latest ? d.updatedAt : latest, datasets[0]?.updatedAt || ''
  );
  
  return {
    total: datasets.length,
    byType,
    byFormat,
    byStatus,
    totalSize,
    lastUpdated
  };
};

// Get single dataset by ID
export const getDataset = async (id: string): Promise<EvaluationDataset | null> => {
  await delay(200);
  return mockDatasets.find(d => d.id === id) || null;
};

// Create new dataset
export const createDataset = async (dataset: Omit<EvaluationDataset, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvaluationDataset> => {
  await delay(500);
  
  const newDataset: EvaluationDataset = {
    ...dataset,
    id: `ds-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDatasets.push(newDataset);
  return newDataset;
};

// Update existing dataset
export const updateDataset = async (id: string, updates: Partial<EvaluationDataset>): Promise<EvaluationDataset> => {
  await delay(400);
  
  const index = mockDatasets.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error(`Dataset with id ${id} not found`);
  }
  
  const updatedDataset = {
    ...mockDatasets[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  mockDatasets[index] = updatedDataset;
  return updatedDataset;
};

// Delete dataset
export const deleteDataset = async (id: string): Promise<void> => {
  await delay(300);
  
  const index = mockDatasets.findIndex(d => d.id === id);
  if (index === -1) {
    throw new Error(`Dataset with id ${id} not found`);
  }
  
  mockDatasets.splice(index, 1);
};

// Validate dataset format and schema
export const validateDataset = async (id: string): Promise<{ valid: boolean; errors: string[] }> => {
  await delay(1000); // Simulate validation processing time
  
  const dataset = await getDataset(id);
  if (!dataset) {
    return { valid: false, errors: ['Dataset not found'] };
  }
  
  // Mock validation logic
  const errors: string[] = [];
  
  if (!dataset.schema.requiredFields.length) {
    errors.push('No required fields defined in schema');
  }
  
  if (dataset.size === 0) {
    errors.push('Dataset is empty');
  }
  
  if (dataset.metadata.quality === 'low') {
    errors.push('Dataset quality is marked as low');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Get available tags for filtering
export const getAvailableTags = async (): Promise<string[]> => {
  await delay(100);
  
  const allTags = mockDatasets.flatMap(d => d.tags);
  return [...new Set(allTags)].sort();
};

// Get available domains
export const getAvailableDomains = async (): Promise<string[]> => {
  await delay(100);
  
  const allDomains = mockDatasets.map(d => d.metadata.domain);
  return [...new Set(allDomains)].sort();
};

// Upload dataset file (mock implementation)
export const uploadDatasetFile = async (file: File, datasetId: string): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  await delay(2000); // Simulate file upload time
  
  // Mock validation
  if (file.size > 100 * 1024 * 1024) { // 100MB limit
    return { success: false, error: 'File size exceeds 100MB limit' };
  }
  
  const allowedFormats = ['json', 'csv', 'jsonl', 'parquet'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !allowedFormats.includes(fileExtension)) {
    return { success: false, error: 'Unsupported file format' };
  }
  
  const filePath = `/datasets/${datasetId}/${file.name}`;
  
  return {
    success: true,
    filePath
  };
};