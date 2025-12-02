
import { AnalysisData, HypothesisAnalysisData, DimensionType } from '@/model/analysis';
import { HypothesisType } from '@/model/Hypothesis';
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import { hypothesisService } from './hypothesisService';

const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Interface for Analysis Service
interface IAnalysisService {
    load_analysis_data(hypothesisId:string): Promise<HypothesisAnalysisData>;
    start_analysis(hypotheses:HypothesisType): Promise<void>;
    save_analysis_result(analysisResult: any): Promise<any>;
}

// Analysis Result Class
export class AnalysisResult {
    constructor(
        public hypotheses: HypothesisType[],
        public ageDistribution: any,
        public metricTrend: any,
        public testResults: any
    ) { }
}

// Mock data for analysis
const analysisData = {
    "hypotheses": [
      {
        "id": "1",
        "title": "Age Group and Insurance Purchase Intent Correlation",
        "description": "Hypothesis that customer age groups have a significant correlation with their willingness to purchase specific insurance products, especially in the 45-60 age group.",
        "status": "testing",
        "confidence": 75,
        "metrics": ["Customer Acquisition Rate", "Conversion Rate", "Age Distribution"],
        "createdAt": "2023-11-10T10:30:00Z"
      },
      {
        "id": "2",
        "title": "High-Value Customer Churn Prediction Model",
        "description": "Through historical data and customer behavior patterns, we can predict the churn risk of high-value customers and take targeted intervention measures.",
        "status": "validated",
        "confidence": 92,
        "metrics": ["Customer Retention Rate", "Customer Value", "Interaction Frequency"],
        "createdAt": "2023-11-05T08:15:00Z"
      }
    ],
    "ageDistributionData": [
      { "name": "18-24", "value": 15, "conversion": 1.8 },
      { "name": "25-34", "value": 22, "conversion": 2.5 },
      { "name": "35-44", "value": 28, "conversion": 3.2 },
      { "name": "45-54", "value": 35, "conversion": 4.1 },
      { "name": "55-64", "value": 42, "conversion": 4.8 },
      { "name": "65+", "value": 32, "conversion": 3.5 }
    ],
    "metricTrendData": [
      { "month": "Jun", "conversionRate": 2.8, "customerAcquisitionRate": 12.5 },
      { "month": "Jul", "conversionRate": 3.1, "customerAcquisitionRate": 13.2 },
      { "month": "Aug", "conversionRate": 3.5, "customerAcquisitionRate": 14.0 },
      { "month": "Sep", "conversionRate": 3.8, "customerAcquisitionRate": 14.8 },
      { "month": "Oct", "conversionRate": 4.2, "customerAcquisitionRate": 15.5 },
      { "month": "Nov", "conversionRate": 4.8, "customerAcquisitionRate": 16.3 }
    ],
    "testResults": [
      {
        "name": "All Customer Samples",
        "conversionA": 3.2,
        "conversionB": 4.8,
        "sampleSize": 12500,
        "pValue": 0.0012
      },
      {
        "name": "45-60 Age Customers",
        "conversionA": 3.5,
        "conversionB": 5.8,
        "sampleSize": 4800,
        "pValue": 0.0004
      },
      {
        "name": "Other Age Customers",
        "conversionA": 3.0,
        "conversionB": 4.1,
        "sampleSize": 7700,
        "pValue": 0.0310
      }
    ],
    "metricsCardData": {
      "significance": {
        "pValue": 0.0012,
        "label": "Statistically Significant (p<0.01)"
      },
      "analysisData": {
        "sampleSize": 12500,
        "duration": "6 Months Data"
      },
      "lastAnalysis": {
        "date": "Nov 15",
        "daysAgo": "3 days ago"
      }
    },
    "customerCharacteristics": [
      { "label": "Average Annual Income", "value": "¥320,000", "percentage": 75 },
      { "label": "Has Children Ratio", "value": "78%", "percentage": 78 },
      { "label": "Home Ownership Rate", "value": "85%", "percentage": 85 },
      { "label": "Health Awareness", "value": "High (8.2/10)", "percentage": 82 }
    ],
    "purchaseBehaviors": [
      {
        "icon": "pie",
        "title": "Product Preferences",
        "description": "Health Insurance (42%), Life Insurance (28%), Pension Products (18%)"
      },
      {
        "icon": "bar",
        "title": "Purchase Channels",
        "description": "Agents (65%), Online (25%), Bancassurance (10%)"
      },
      {
        "icon": "line",
        "title": "Decision Cycle",
        "description": "Average 15 days, 25% shorter than other age groups"
      }
    ]
};

// Analysis Service Implementation
export class AnalysisService implements IAnalysisService {
    async load_analysis_data(hypothesisId:string): Promise<HypothesisAnalysisData> {
        console.log('AnalysisService - load_analysis_data called with hypothesisId:', hypothesisId);
        console.log('AnalysisService - isMockMode:', isMockMode);
        
        
        try {
            // load analisys data by hypothesis id  url /analysis/hypothesis/{hypothesis_id}
            const response = await fetch(`${API_BASE_URL}/watchmen/ai/analysis/hypothesis/${hypothesisId}`, {
                headers: getDefaultHeaders()
            });
            const hypothesis = await hypothesisService.getHypothesisById(hypothesisId);
            const analysis_data:HypothesisAnalysisData = await checkResponse(response);

            console.log('AnalysisService - API response:', analysis_data);

            return {
                    analysis_id: analysis_data.analysis_id,
                    hypothesis: hypothesis,
                    data_explain_dict: analysis_data.data_explain_dict,
                    analysis_metrics: analysis_data.analysis_metrics,
              };
        } catch (error) {
            console.error('AnalysisService - Error fetching analysis data:', error);
            console.log('AnalysisService - Falling back to mock data due to API error');
      
        }
    }

    async start_analysis(hypotheses:HypothesisType): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/watchmen/ai/analysis/start`, {
                method: 'POST',
                headers: getDefaultHeaders(),
                body: JSON.stringify(hypotheses)
            });
            await checkResponse(response);
        } catch (error) {
            console.error('Error starting analysis:', error);
            throw error;
        }
    }

    async save_analysis_result(analysisResult: any): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/watchmen/ai/analysis/save`, {
                method: 'POST',
                headers: getDefaultHeaders(),
                body: JSON.stringify(analysisResult)
            });
            return await checkResponse(response);
        } catch (error) {
            console.error('Error saving analysis result:', error);
            throw error;
        }
    }
}

export const analysis_service = new AnalysisService();