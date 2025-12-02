import { aiAgentService } from '@/services/aiAgentService';
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';

/**
 * 查询历史经验步骤处理器
 */
export class QueryHistoryProcessor extends BaseStepProcessor {
  stepId = 'queryHistory';
  stepTitle = 'Query Historical Experience';
  stepDescription = 'Search for similar business challenge analysis cases and results from the past.';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // 调用AI代理服务查询历史经验
      const result = await aiAgentService.query_historical_experience(
        context.businessChallenge
      );

      // 更新分析结果
      const updatedAnalysisResult = {
        ...context.analysisResult,
        queryHistoryResult: result
      };

      // 记录日志
      const logTitle = 'Historical Experience Query Complete';
      const logDescription = `Similar Cases Found: ${result.hasSimilar ? 'Yes' : 'No'}`;
      
      return {
        success: true,
        result: {
          ...result,
          updatedAnalysisResult,
          log: this.createLog(logTitle, logDescription, 'success')
        },
        shouldContinue: true
      };
    } catch (error) {
      console.error('Error querying historical experience:', error);
      
      const errorResult = {
        hasSimilar: false,
        similarChallenges: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        result: {
          ...errorResult,
          log: this.createLog(
            'Historical Experience Query Failed',
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