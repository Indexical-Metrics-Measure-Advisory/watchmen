import { aiAgentService } from '@/services/aiAgentService';
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';
import { BusinessChallengeWithProblems } from '@/model/business';
import { cleanMetadataFields } from '@/utils/dataCleaningUtils';

/**
 * 生成分析报告步骤处理器
 */
export class GenerateReportProcessor extends BaseStepProcessor {
  stepId = 'generateReport';
  stepTitle = 'Build Conclusions and Generate Analysis Report';
  stepDescription = 'Summarize the analysis process, generate final report, and provide feedback mechanism.';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // 模拟：构建结论，生成分析报告
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟处理时间
      
      // 从之前的步骤结果中获取验证结果
      const answerBusinessProblemResult = context.analysisResult?.answerBusinessProblemResult;
      const validationResult = answerBusinessProblemResult?.validationResult || {
        confidence: 75,
        insights: ['Default insight from analysis']
      };

      const simulation_result = context.analysisResult?.simulationResult
      
      // Clean metadata fields from simulation result to avoid validation errors
      const cleanedSimulationResult = cleanMetadataFields(simulation_result);
      
      // Log the cleaning operation for debugging
      console.log('Cleaned simulation result for report generation:', {
        originalKeys: simulation_result ? Object.keys(simulation_result) : [],
        cleanedKeys: cleanedSimulationResult ? Object.keys(cleanedSimulationResult) : []
      });

      const report_result = await aiAgentService.build_conclusions_and_generate_analysis_report(
        cleanedSimulationResult
      );

      if (context.analysisResult?.simulationResult?.result && report_result?.result?.challengeMarkdown) {
        context.analysisResult.simulationResult.result.challengeMarkdown = report_result.result.challengeMarkdown;
      }

      
      const reportData = {
        summary: `For business challenge "${context.businessChallenge.title}", AI analysis indicates that the key hypothesis is the core driving factor.`,
        findings: validationResult.insights || [],
        recommendations: ['Specific Recommendation 1', 'Specific Recommendation 2'],
        confidenceScore: validationResult.confidence || 75,
        isLogical: (validationResult.confidence || 75) > 75,
        customerRating: null, // To be filled by user
        challengeId: context.businessChallenge.id
      };

      // 更新分析结果
      const updatedAnalysisResult = {
        ...context.analysisResult,
        generateReportResult: report_result,
        simulationResult: {
          ...context.analysisResult?.simulationResult,
          
        }
      };

      // 记录日志
      const logTitle = 'Analysis Report Generated';
      const logDescription = `Report Confidence: ${reportData.confidenceScore}%`;
      
      return {
        success: true,
        result: {
          ...reportData,
          updatedAnalysisResult,
          
          log: this.createLog(logTitle, logDescription, 'success')
        },
        shouldContinue: true
      };
    } catch (error) {
      console.error('Error generating report:', error);
      
      const errorResult = {
        summary: 'Failed to generate analysis report',
        findings: [],
        recommendations: [],
        confidenceScore: 0,
        isLogical: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        result: {
          ...errorResult,
          log: this.createLog(
            'Analysis Report Generation Failed',
            `Error: ${errorResult.error}`,
            'error'
          )
        },
        error: errorResult.error,
        shouldContinue: false
      };
    }
  }

  canExecute(context: StepExecutionContext): boolean {
    return super.canExecute(context) && !!context.businessChallenge;
  }
}