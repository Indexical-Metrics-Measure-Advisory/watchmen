
import { metricsService } from '@/services/metricsService';

// Define category-based metric groupings
export const metricCategories = {
  'customer_acquisition': [
    'Customer Acquisition Rate',
    'Customer Acquisition Cost',
    'Conversion Rate',
    'Marketing Spend',
  ],
  'customer_behavior': [
    'Age Distribution',
    'Customer Value',
    'Interaction Frequency',
    'Channel Usage Rate',
  ],
  'customer_retention': [
    'Customer Retention Rate',
    'Renewal Rate',
    'Customer Satisfaction',
    'Issue Resolution Time',
  ],
  'risk_assessment': [
    'Claims Frequency',
    'Customer Risk Score',
    'Claims Amount',
    'Price Sensitivity',
  ]
};

// Keywords that help map hypotheses to metric categories
export const categoryKeywords = {
  'customer_acquisition': [
    'acquisition', 'marketing', 'conversion', 'purchase intent', 
    'new customer', 'campaign', 'advertising', 'channel efficiency'
  ],
  'customer_behavior': [
    'behavior', 'age', 'demographic', 'segment', 'characteristic', 
    'interaction', 'usage', 'preferences'
  ],
  'customer_retention': [
    'retention', 'churn', 'loyalty', 'renewal', 'satisfaction', 
    'service', 'support', 'experience'
  ],
  'risk_assessment': [
    'risk', 'claim', 'pricing', 'underwriting', 'premium', 
    'loss', 'frequency', 'severity'
  ]
};

/**
 * Analyzes a hypothesis and returns relevant metric names
 * @param title - The hypothesis title
 * @param description - The hypothesis description
 * @returns An array of relevant metric names
 */
export const getRelevantMetrics = async (title: string, description: string): Promise<string[]> => {
  return metricsService.suggestMetrics(title, description);
};

/**
 * Suggests metrics for a hypothesis
 * @param hypothesis - The hypothesis object
 * @returns An array of suggested metric names
 */
export const suggestMetricsForHypothesis = async (hypothesis: { 
  title: string; 
  description: string; 
  metrics?: string[];
}): Promise<string[]> => {
  // If hypothesis already has metrics, return those
  if (hypothesis.metrics && hypothesis.metrics.length > 0) {
    return hypothesis.metrics;
  }
  
  return await getRelevantMetrics(hypothesis.title, hypothesis.description);
};
