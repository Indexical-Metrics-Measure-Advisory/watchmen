/**
 * Interface representing a Data Product.
 */
export interface DataProduct {
  /** Unique identifier for the data product */
  id: string;
  /** Version string of the data product (e.g., "v1.0.0") */
  version: string;
  /** Display name of the data product */
  name: string;
  /** Detailed description of the data product */
  description: string;
  /** Name or ID of the product owner */
  productOwner: string;
  /** Visibility level of the data product */
  visibility: 'public' | 'private' | 'organization';
  /** Current lifecycle status of the data product */
  status: 'development' | 'production' | 'deprecated' | 'sunset';
  /** List of tags associated with the data product */
  tags: string[];
  /** List of categories the data product belongs to */
  categories: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Counts of different data components included in the product */
  dataComponents: {
    datasets: number;
    apis: number;
    files: number;
  };
  /** Quality scores for various dimensions */
  quality: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    consistency: number;
  };
  /** Service Level Agreement details (optional) */
  sla?: {
    availability: string;
    responseTime: string;
    updateFrequency: string;
  };
  /** Pricing model and details */
  pricing: {
    model: 'free' | 'subscription' | 'usage-based';
    price?: string;
  };
  /** Number of active consumers */
  consumers: number;
  /** License information (optional) */
  license?: string;
}
