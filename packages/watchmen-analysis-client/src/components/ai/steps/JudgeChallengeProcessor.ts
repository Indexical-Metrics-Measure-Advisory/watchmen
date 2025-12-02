import { aiAgentService } from '@/services/aiAgentService';
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';

/**
 * 评估保险业务挑战步骤处理器
 */
export class JudgeChallengeProcessor extends BaseStepProcessor {
  stepId = 'judgeChallenge';
  stepTitle = 'Evaluate Insurance Business Challenge';
  stepDescription = 'Assess if the current business challenge is suitable for AI analysis and provide initial recommendations.';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // 调用AI代理服务评估保险业务挑战
      const result = await aiAgentService.evaluate_insurance_business_challenge(
        context.businessChallenge
      );

      // 更新分析结果
      const updatedAnalysisResult = {
        ...context.analysisResult,
        judgeChallengeResult: result
      };

      // 记录日志
      const logTitle = 'Business Challenge Assessment Complete';
      const logDescription = `Assessment Result: ${result.isGoodChallenge ? 'Good' : 'Needs Improvement'}`;
      
      
      if (result.verification_pass) {
        return {
        success: true,
        result: {
          ...result,
          updatedAnalysisResult,
          log: this.createLog(logTitle, logDescription, 'success')
        },
        shouldContinue: true
      };
        
      }else {
        return {
          success: true,
          result: {
            ...result,
            updatedAnalysisResult,
            log: this.createLog(logTitle, logDescription, 'error')
          },
          shouldContinue: false
        };
      }

      
    } catch (error) {
      console.error('Error evaluating challenge:', error);
      
      const errorResult = {
        isGoodChallenge: false,
        suggestions: ['Error occurred during evaluation'],
        requiredContext: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        result: {
          ...errorResult,
          log: this.createLog(
            'Business Challenge Assessment Failed',
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