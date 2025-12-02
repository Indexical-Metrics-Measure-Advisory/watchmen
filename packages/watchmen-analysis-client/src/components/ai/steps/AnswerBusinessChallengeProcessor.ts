import { cleanMetadataFields } from '@/utils/dataCleaningUtils';
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';
import { API_BASE_URL, checkResponse, getDefaultHeaders } from '@/utils/apiConfig';
import { aiAgentService } from '@/services/aiAgentService';

/**
 * 回答业务挑战步骤处理器
 */
export class AnswerBusinessChallengeProcessor extends BaseStepProcessor {
  stepId = 'answerBusinessChallenge';
  stepTitle = 'Attempt to Answer Business Challenge';
  stepDescription = 'Provide answers to the original business challenge based on simulation results.';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // Get simulation result from context
      const simulateResult = context.analysisResult?.simulationResult;
      
      if (!simulateResult) {
        throw new Error('No simulation result found in context');
      }
      const cleanedSimulationResult = cleanMetadataFields(simulateResult);

      // Call API to answer business challenge evaluation
      const simulation_result = await aiAgentService.attempt_to_answer_business_challenge(cleanedSimulationResult);
      
      const challenge = simulation_result["challenge"]
      // context.analysisResult = simulation_result

      // 更新分析结果
      const updatedAnalysisResult = {
        ...context.analysisResult,
        simulationResult: {
          simulationId: simulation_result["simulationId"],
          environmentStatus: 'Simulation Environment Built',
          challenge: challenge,
          result: simulation_result["result"]
        }
      };

      // 记录日志
      const logTitle = 'Business Challenge Answer Attempt';
      // const logDescription = result.challengeAnswer;
      this.createLog(logTitle, "", 'success')
      return {
        success: true,
        result: {
          environmentStatus: 'Simulation Environment Built',
          challenge: challenge,
          updatedAnalysisResult,
          businessChallengeWithProblems: challenge,
          logs: [ this.createLog(logTitle, "", 'success')]
        },
        shouldContinue: true
      };
    } catch (error) {
      console.error('Error answering business challenge:', error);
      
      const errorResult = {
        challengeAnswer: 'Failed to answer business challenge',
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        result: {
          ...errorResult,
          log: this.createLog(
            'Business Challenge Answer Failed',
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