
import { HypothesisAnalysisData } from '@/model/analysis';
import { getDefaultHeaders, checkResponse, API_AI_URL } from '@/utils/apiConfig';
import { hypothesisService } from './hypothesisService';

// Response of the start analysis endpoint
export interface StartAnalysisResponse {
    success: boolean;
    hypothesisId: string;
    hypothesisValidationFlag: boolean | null;
    status: 'drafted' | 'testing' | 'validated' | 'rejected';
    message?: string;
}

// Interface for Analysis Service
interface IAnalysisService {
    load_analysis_data(hypothesisId: string): Promise<HypothesisAnalysisData | null>;
    start_analysis(hypothesisId: string): Promise<StartAnalysisResponse>;
    save_analysis_result(analysisResult: any): Promise<any>;
}

// Analysis Service Implementation
export class AnalysisService implements IAnalysisService {
    async load_analysis_data(hypothesisId: string): Promise<HypothesisAnalysisData | null> {
        try {
            // load analysis data by hypothesis id  url /analysis/hypothesis/{hypothesis_id}
            const response = await fetch(`${API_AI_URL}/analysis/hypothesis/${hypothesisId}`, {
                headers: getDefaultHeaders()
            });
            const analysis_data: HypothesisAnalysisData | null = await checkResponse(response);

            // backend returns null when no analysis has been persisted yet
            if (!analysis_data) {
                return null;
            }

            const hypothesis = await hypothesisService.getHypothesisById(hypothesisId);

            return {
                    analysis_id: analysis_data.analysis_id,
                    hypothesis: hypothesis,
                    data_explain_dict: analysis_data.data_explain_dict,
                    analysis_metrics: analysis_data.analysis_metrics,
              };
        } catch (error) {
            console.error('AnalysisService - Error fetching analysis data:', error);
            throw error;
        }
    }

    async start_analysis(hypothesisId: string): Promise<StartAnalysisResponse> {
        try {
            const response = await fetch(`${API_AI_URL}/analysis/hypothesis/start`, {
                method: 'POST',
                headers: getDefaultHeaders(),
                body: JSON.stringify({ hypothesisId })
            });
            return await checkResponse(response);
        } catch (error) {
            console.error('Error starting analysis:', error);
            throw error;
        }
    }

    async save_analysis_result(analysisResult: any): Promise<any> {
        try {
            const response = await fetch(`${API_AI_URL}/analysis/save`, {
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
