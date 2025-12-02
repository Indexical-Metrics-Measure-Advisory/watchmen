import { aiAgentService } from '@/services/aiAgentService';
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';

/**
 * 查询知识库步骤处理器
 */
export class QueryKnowledgeBaseProcessor extends BaseStepProcessor {
  stepId = 'queryKnowledgeBase';
  stepTitle = 'Query Knowledge Base';
  stepDescription = 'Retrieve relevant insurance industry knowledge, analysis logic, and models.';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // 调用AI代理服务查询知识库
      const result = await aiAgentService.query_knowledge_base(
        context.businessChallenge
      );

      // 更新分析结果
      const updatedAnalysisResult = {
        ...context.analysisResult,
        queryKnowledgeBaseResult: result
      };

      // 记录日志
      const logTitle = 'Knowledge Base Query Complete';
      const logDescription = `Knowledge base query completed successfully`;
      
      return {
        success: true,
        result: {
          knowledgeBaseResult: result,
          updatedAnalysisResult,
          log: this.createLog(logTitle, logDescription, 'success')
        },
        shouldContinue: true
      };
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      
      const errorResult = {
        hasKnowledgeBase: false,
        knowledgeBaseChallenges: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        result: {
          ...errorResult,
          log: this.createLog(
            'Knowledge Base Query Failed',
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