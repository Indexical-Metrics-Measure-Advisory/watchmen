export type MetricCategory = 'Volume' | 'Ratio' | 'Average' | 'Composition' | 'Change';

export interface MetricType {
    id: string;
    name: string;
    value: number;
    unit: string;
    change: number;
    valueReadable?: string;
    changeReadable?: string;
    status: 'positive' | 'negative' | 'neutral';
    description?: string;
    lastUpdated: string;
    category?: MetricCategory;
    categoryId?: string;
  }
  

  export interface MetricDimension {
    id: string;
    name: string;
    description: string;
    importance: number;
    type: 'time' | 'text' | 'number';
    format?: string;
    unit?: string;
    range?: {
      min?: number;
      max?: number;
    };
  }

  export interface MetricDetail{
    metric: MetricType;
    dimensions: MetricDimension[];
    // usage: MetricUsage[];
    // metadata: MetricMetadata;
  }
  
  export interface MetricUsage {
    id: string;
    name: string;
    description: string;
  }
  
  export interface MetricMetadata {
    definition: string;
    calculation: string;
    dataSource: string;
    updateFrequency: string;
    owner: string;
    relatedMetrics: Array<{id: string, name: string}>;
  }

  export interface AnalysisDimension {
    id: string;
    name: string;
    type: 'time' | 'category';
    options?: Array<{
      id: string;
      name: string;
    }>;
  }