import { ChallengeAnalysisResult, ChallengeAnalysisSummary, SimulationResult } from "@/model/challengeAnalysis";
import { API_BASE_URL, getDefaultHeaders, checkResponse } from '@/utils/apiConfig';
import { BusinessChallenge } from "@/model/business";
import { HypothesisType } from "@/model/Hypothesis";
import { MetricType } from "@/model/Metric";
import { Insight } from "@/model/Hypothesis";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock challenge analysis data
const mockChallengeAnalyses: ChallengeAnalysisResult[] = [
  {
    id: 'ca1',
    businessChallengeId: 'bc1',
    title: 'Customer Retention Analysis',
    summary: 'Analysis shows that improving customer service response time and personalized offers can significantly reduce high-value customer churn rate. Key metrics indicate a 15% improvement potential.',
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2023-11-25T14:30:00Z',
    status: 'completed',
    insights: [
      {
        title: 'Customer Service Impact',
        type: 'opportunity',
        description: 'Customers who receive responses within 4 hours are 35% less likely to churn',
        priority: 'high'
      },
      {
        title: 'Pricing Sensitivity',
        type: 'risk',
        description: 'Premium increases above 8% result in 3x higher churn rate',
        priority: 'medium'
      }
    ],
    validatedHypotheses: [
      {
        id: '1',
        title: 'Customer Service Response Time',
        description: 'Faster customer service response times lead to higher retention rates',
        status: 'validated',
        confidence: 0.92,
        metrics: ['response_time', 'retention_rate'],
        createdAt: '2023-10-22T09:15:00Z',
        businessProblemId: 'bp1'
      }
    ],
    rejectedHypotheses: [
      {
        id: '2',
        title: 'Product Feature Impact',
        description: 'Adding more product features will reduce churn rate',
        status: 'rejected',
        confidence: 0.35,
        metrics: ['feature_count', 'churn_rate'],
        createdAt: '2023-10-23T11:30:00Z',
        businessProblemId: 'bp1'
      }
    ],
    keyMetrics: [
      {
        id: 'metric1',
        name: 'Customer Churn Rate',
        value: 5.2,
        unit: '%',
        change: -1.3,
        valueReadable: '5.2%',
        changeReadable: '-1.3%',
        status: 'positive',
        description: 'Percentage of customers who left within the last 30 days',
        lastUpdated: '2023-11-24T00:00:00Z',
        category: 'Ratio'
      },
      {
        id: 'metric2',
        name: 'Customer Lifetime Value',
        value: 2450,
        unit: '$',
        change: 320,
        valueReadable: '$2,450',
        changeReadable: '+$320',
        status: 'positive',
        description: 'Average revenue expected from a customer throughout their relationship',
        lastUpdated: '2023-11-24T00:00:00Z',
        category: 'Average'
      }
    ],
    businessProblems: [
      {
        id: 'bp1',
        title: 'High-value Customer Churn Issue',
        description: 'High-value customer churn rate exceeds industry average, requiring root cause analysis and intervention strategies.',
        status: 'in_progress',
        hypothesisIds: ['1', '2'],
        createdAt: '2023-10-20T10:15:00Z',
        businessChallengeId: 'bc1'
      }
    ],
    recommendations: [
      'Implement a service level agreement ensuring 90% of customer inquiries are responded to within 4 hours',
      'Develop a personalized retention program for high-value customers',
      'Review pricing strategy to ensure increases stay below the 8% threshold'
    ],
    nextSteps: [
      'Pilot the new customer service response time program in Q1 2024',
      'Develop customer segmentation model for personalized retention offers',
      'Conduct A/B testing on different retention strategies'
    ]
  },
  {
    id: 'ca2',
    businessChallengeId: 'bc2',
    title: 'Marketing Efficiency Analysis',
    summary: 'Digital channels show 2.3x higher ROI than traditional channels. Reallocating 30% of budget from traditional to digital channels could increase overall marketing ROI by 25%.',
    createdAt: '2023-11-15T09:00:00Z',
    updatedAt: '2023-11-22T16:45:00Z',
    status: 'completed',
    insights: [
      {
        title: 'Digital Channel Efficiency',
        type: 'opportunity',
        description: 'Digital channels deliver 2.3x higher ROI than traditional channels',
        priority: 'high'
      },
      {
        title: 'Customer Acquisition Cost Trend',
        type: 'trendup',
        description: 'CAC has increased 12% year-over-year across all channels',
        priority: 'medium'
      }
    ],
    validatedHypotheses: [
      {
        id: '5',
        title: 'Digital Marketing Efficiency',
        description: 'Digital marketing channels provide better ROI than traditional channels',
        status: 'validated',
        confidence: 0.89,
        metrics: ['marketing_roi', 'cac'],
        createdAt: '2023-11-06T14:20:00Z',
        businessProblemId: 'bp3'
      }
    ],
    rejectedHypotheses: [],
    keyMetrics: [
      {
        id: 'metric3',
        name: 'Marketing ROI',
        value: 3.2,
        unit: 'ratio',
        change: 0.4,
        valueReadable: '3.2x',
        changeReadable: '+0.4x',
        status: 'positive',
        description: 'Return on investment for marketing spend',
        lastUpdated: '2023-11-20T00:00:00Z',
        category: 'Ratio'
      },
      {
        id: 'metric4',
        name: 'Customer Acquisition Cost',
        value: 125,
        unit: '$',
        change: 15,
        valueReadable: '$125',
        changeReadable: '+$15',
        status: 'negative',
        description: 'Average cost to acquire a new customer',
        lastUpdated: '2023-11-20T00:00:00Z',
        category: 'Average'
      }
    ],
    businessProblems: [
      {
        id: 'bp3',
        title: 'Marketing Channel Efficiency Variance',
        description: 'Significant differences in customer acquisition costs and quality across marketing channels require resource allocation optimization.',
        status: 'in_progress',
        hypothesisIds: ['5'],
        createdAt: '2023-11-05T11:45:00Z',
        businessChallengeId: 'bc2'
      }
    ],
    recommendations: [
      'Reallocate 30% of traditional marketing budget to high-performing digital channels',
      'Implement attribution modeling to better track customer journey across channels',
      'Develop channel-specific messaging based on customer segment performance'
    ],
    nextSteps: [
      'Create detailed budget reallocation plan for Q1 2024',
      'Select and implement marketing attribution solution',
      'Develop performance Smart Console for real-time channel ROI monitoring'
    ]
  }
];

export class ChallengeAnalysisService {
  // Get all challenge analyses summaries
  async getChallengeAnalysesSummaries(): Promise<ChallengeAnalysisSummary[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge-analyses`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error('Error fetching challenge analyses:', error);
      
      // Return mock data
      await delay(500);
      return mockChallengeAnalyses.map(analysis => ({
        id: analysis.id,
        businessChallengeId: analysis.businessChallengeId,
        title: analysis.title,
        summary: analysis.summary,
        createdAt: analysis.createdAt,
        status: analysis.status,
        insightsCount: analysis.insights.length,
        validatedHypothesesCount: analysis.validatedHypotheses.length,
        rejectedHypothesesCount: analysis.rejectedHypotheses.length
      }));
    }
  }

  // Get challenge analysis by ID
  async getChallengeAnalysis(id: string): Promise<ChallengeAnalysisResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge-analyses/${id}`, {
        headers: getDefaultHeaders()
      });
      return await checkResponse(response);
    } catch (error) {
      console.error(`Error fetching challenge analysis with ID ${id}:`, error);
      
      // Return mock data
      await delay(500);
      const analysis = mockChallengeAnalyses.find(a => a.id === id);
      if (!analysis) {
        throw new Error(`Challenge analysis with ID ${id} not found`);
      }
      return mockChallengeAnalyses[0];
    }
  }

  // Get challenge analyses by business challenge ID
  async getChallengeAnalysesByAnalysisId(analysisId: string): Promise<SimulationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/analysis/${analysisId}`, {
        headers: getDefaultHeaders()
      });
      const response_result =  await checkResponse(response);
      console.log('result', response_result.result.simulation_result)
      return response_result.result.simulation_result
    } catch (error) {
      console.error(`Error fetching challenge analyses for business challenge ID ${analysisId}:`, error);
      
      // Return mock data
      // await delay(500);
      // return mockChallengeAnalyses[0];
    }
  }

  // Get challenge analyses by challenge ID
  async getChallengeAnalysesByChallengeId(challengeId: string): Promise<SimulationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/analysis/challenge/${challengeId}`, {
        headers: getDefaultHeaders()
      });
      const response_result = await checkResponse(response);
      // console.log('result by challenge id', response_result.result.simulation_result);
      return response_result.simulation_result;
    } catch (error) {
      console.error(`Error fetching challenge analyses for challenge ID ${challengeId}:`, error);
      
      // Return mock data
      await delay(500);
      throw error;
    }
  }

  // Generate a new challenge analysis
  async generateChallengeAnalysis(businessChallengeId: string): Promise<ChallengeAnalysisResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge-analyses/generate`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ businessChallengeId })
      });
      return await checkResponse(response);
    } catch (error) {
      console.error(`Error generating challenge analysis for business challenge ID ${businessChallengeId}:`, error);
      
      // Return mock data
      await delay(1500); // Longer delay to simulate analysis generation
      const existingAnalyses = mockChallengeAnalyses.filter(a => a.businessChallengeId === businessChallengeId);
      if (existingAnalyses.length > 0) {
        return existingAnalyses[0];
      }
      
      // Create a new mock analysis if none exists
      const newAnalysis: ChallengeAnalysisResult = {
        id: `ca${Date.now()}`,
        businessChallengeId,
        title: 'New Challenge Analysis',
        summary: 'This is a newly generated analysis for the business challenge.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed',
        insights: [
          {
            title: 'Initial Insight',
            type: 'opportunity',
            description: 'This is an automatically generated insight.',
            priority: 'medium'
          }
        ],
        validatedHypotheses: [],
        rejectedHypotheses: [],
        keyMetrics: [],
        businessProblems: [],
        recommendations: [
          'This is an automatically generated recommendation.'
        ],
        nextSteps: [
          'This is an automatically generated next step.'
        ]
      };
      
      return newAnalysis;
    }
  }
}

export const challengeAnalysisService = new ChallengeAnalysisService();