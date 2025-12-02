// Chat-specific metrics service extracted from chat.tsx
// Provides metric metadata and common constants for the chat page

export type ChatMetric = {
  id: 'policy_sales' | 'loan_approval' | 'claim_amount' | 'customer_retention';
  name: string;
  description: string;
  dimensions: string[];
};

export type MetricId = ChatMetric['id'];

// Metric metadata used by chat page
export const METRICS: ChatMetric[] = [
  { id: 'policy_sales', name: 'Policy Sales', description: 'Daily new policy count', dimensions: ['Product Type', 'Region', 'Agent'] },
  { id: 'loan_approval', name: 'Loan Approval Rate', description: 'Loan application approval ratio', dimensions: ['Loan Type', 'Credit Score', 'Region'] },
  { id: 'claim_amount', name: 'Claim Amount', description: 'Total insurance claim amount', dimensions: ['Claim Type', 'Product Line', 'Region'] },
  { id: 'customer_retention', name: 'Customer Retention Rate', description: 'Customer renewal ratio', dimensions: ['Customer Segment', 'Product Type', 'Region'] }
];

// Supported time ranges in chat queries
export const TIME_RANGES = ['Past 7 days', 'Past 30 days', 'Past 90 days', 'Past year'] as const;

// Optional helpers for downstream usage (kept simple; chat.tsx still owns generation logic)
export type TimeRange = typeof TIME_RANGES[number];

export const findMetricById = (id: ChatMetric['id']) => METRICS.find(m => m.id === id);

// ---- Data helpers extracted from chat.tsx ----
export type DataPoint = { date: string; value: number; formatted: string };

export const generateMockData = (metric: ChatMetric['id'], timeRange: TimeRange | string): DataPoint[] => {
  const days = timeRange === 'Past 7 days' ? 7 : timeRange === 'Past 30 days' ? 30 : timeRange === 'Past 90 days' ? 90 : 365;
  const data: DataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    let value: number;
    switch (metric) {
      case 'policy_sales':
        value = Math.floor(Math.random() * 100) + 50;
        break;
      case 'loan_approval':
        value = Math.random() * 0.3 + 0.7; // 70-100%
        break;
      case 'claim_amount':
        value = Math.floor(Math.random() * 1000000) + 500000;
        break;
      case 'customer_retention':
        value = Math.random() * 0.2 + 0.8; // 80-100%
        break;
      default:
        value = Math.random() * 100;
    }

    data.push({
      date: date.toLocaleDateString(),
      value,
      formatted:
        (typeof metric === 'string' && (metric.includes('rate') || metric.includes('retention')))
          ? `${(value * 100).toFixed(1)}%`
          : metric === 'claim_amount'
            ? `¥${Math.round(value).toLocaleString()}`
            : value.toString(),
    });
  }

  return data;
};

export const generateInsights = (metric: ChatMetric['id'], data: DataPoint[]): string[] => {
  const insights: string[] = [];
  const values = data.map(d => d.value);
  const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const trend = values.length > 1 && values[values.length - 1] > values[0] ? 'increasing' : 'decreasing';

  switch (metric) {
    case 'policy_sales':
      insights.push(`Policy sales show ${trend} trend, with average daily sales of ${avg.toFixed(0)} policies`);
      insights.push('Recommend focusing on product type distribution during sales peaks');
      break;
    case 'loan_approval':
      insights.push(`Loan approval rate is ${trend}, with average approval rate of ${(avg * 100).toFixed(1)}%`);
      insights.push('Recommend optimizing risk control models to improve approval efficiency');
      break;
    case 'claim_amount':
      insights.push(`Claim amount is ${trend}, with average daily claims of ¥${Math.round(avg).toLocaleString()}`);
      insights.push('Recommend strengthening claim review process management');
      break;
    case 'customer_retention':
      insights.push(`Customer retention rate is ${trend}, with average retention rate of ${(avg * 100).toFixed(1)}%`);
      insights.push('Recommend developing customer care plans to improve satisfaction');
      break;
  }

  return insights;
};

export const generateRecommendations = (metric: ChatMetric['id'], insights: string[]): string[] => {
  const recommendations: string[] = [];

  switch (metric) {
    case 'policy_sales':
      recommendations.push('Strengthen digital marketing channel development');
      recommendations.push('Optimize product portfolio strategy');
      recommendations.push('Improve agent training quality');
      break;
    case 'loan_approval':
      recommendations.push('Improve credit assessment system');
      recommendations.push('Simplify approval process');
      recommendations.push('Strengthen risk control measures');
      break;
    case 'claim_amount':
      recommendations.push('Establish intelligent claims system');
      recommendations.push('Enhance fraud detection capabilities');
      recommendations.push('Optimize claims service process');
      break;
    case 'customer_retention':
      recommendations.push('Establish customer segmentation management system');
      recommendations.push('Launch personalized product services');
      recommendations.push('Strengthen customer relationship maintenance');
      break;
  }

  return recommendations;
};