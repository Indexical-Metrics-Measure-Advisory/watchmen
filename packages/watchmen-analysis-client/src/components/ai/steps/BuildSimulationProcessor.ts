import { aiAgentService } from '@/services/aiAgentService';
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';

/**
 * 构建业务问题仿真环境步骤处理器
 */
export class BuildSimulationProcessor extends BaseStepProcessor {
  stepId = 'buildSimulation';
  stepTitle = 'Build Business Problem Simulation Environment';
  stepDescription = 'Create simulation analysis environment based on historical experience and knowledge base.';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      console.log('buildSimulation');
      
      // 记录开始构建仿真环境的日志
      const startLog = this.createLog(
        'Starting to build simulation environment...',
        '',
        'info'
      );

      // 调用AI代理服务构建业务问题仿真环境
      const simulation_result = await aiAgentService.build_business_problem_simulation_environment(
        context.businessChallenge
      );
      const challenge = simulation_result["challenge"]
      // context.analysisResult = simulation_result

      // 提取 ChallengeAnalysisResult 结构化数据
      const analysisResult = simulation_result["result"];
      
      // 创建详细的日志信息基于 ChallengeAnalysisResult 结构
      const detailedLogs = [];
      
      // 记录业务问题分析
      if (analysisResult?.businessProblems && analysisResult.businessProblems.length > 0) {
        detailedLogs.push(this.createLog(
          'Business Problems Identified',
          `Found ${analysisResult.businessProblems.length} business problems: ${analysisResult.businessProblems.map(p => p.title).join(', ')}`,
          'info'
        ));
      }
      
      // 记录假设验证结果
      if (analysisResult?.validatedHypotheses && analysisResult.validatedHypotheses.length > 0) {
        detailedLogs.push(this.createLog(
          'Validated Hypotheses',
          `${analysisResult.validatedHypotheses.length} hypotheses validated: ${analysisResult.validatedHypotheses.map(h => h.title).join(', ')}`,
          'success'
        ));
      }
      
      if (analysisResult?.rejectedHypotheses && analysisResult.rejectedHypotheses.length > 0) {
        detailedLogs.push(this.createLog(
          'Rejected Hypotheses',
          `${analysisResult.rejectedHypotheses.length} hypotheses rejected: ${analysisResult.rejectedHypotheses.map(h => h.title).join(', ')}`,
          'warning'
        ));
      }
      
      // 记录关键指标
      if (analysisResult?.keyMetrics && analysisResult.keyMetrics.length > 0) {
        detailedLogs.push(this.createLog(
          'Key Metrics Identified',
          `${analysisResult.keyMetrics.length} key metrics: ${analysisResult.keyMetrics.map(m => m.name).join(', ')}`,
          'info'
        ));
      }
      
      // 记录洞察发现
      if (analysisResult?.insights && analysisResult.insights.length > 0) {
        detailedLogs.push(this.createLog(
          'Insights Generated',
          `${analysisResult.insights.length} insights discovered: ${analysisResult.insights.map(i => i.title).join(', ')}`,
          'success'
        ));
      }
      
      // 记录推荐建议
      if (analysisResult?.recommendations && analysisResult.recommendations.length > 0) {
        detailedLogs.push(this.createLog(
          'Recommendations Generated',
          `${analysisResult.recommendations.length} recommendations: ${analysisResult.recommendations.slice(0, 2).join('; ')}${analysisResult.recommendations.length > 2 ? '...' : ''}`,
          'info'
        ));
      }
      
      // 记录下一步行动
      if (analysisResult?.nextSteps && analysisResult.nextSteps.length > 0) {
        detailedLogs.push(this.createLog(
          'Next Steps Defined',
          `${analysisResult.nextSteps.length} next steps identified: ${analysisResult.nextSteps.slice(0, 2).join('; ')}${analysisResult.nextSteps.length > 2 ? '...' : ''}`,
          'info'
        ));
      }
      
      // 记录分析状态
      if (analysisResult?.status) {
        detailedLogs.push(this.createLog(
          'Analysis Status',
          `Analysis status: ${analysisResult.status}`,
          analysisResult.status === 'completed' ? 'success' : 'info'
        ));
      }

      // 更新分析结果
      const updatedAnalysisResult = {
        ...context.analysisResult,
        simulationResult: {
          simulationId: simulation_result["simulationId"],
          environmentStatus: 'Simulation Environment Built',
          challenge: challenge,
          result: simulation_result["result"],
          analysisDetails: {
            businessProblemsCount: analysisResult?.businessProblems?.length || 0,
            validatedHypothesesCount: analysisResult?.validatedHypotheses?.length || 0,
            rejectedHypothesesCount: analysisResult?.rejectedHypotheses?.length || 0,
            keyMetricsCount: analysisResult?.keyMetrics?.length || 0,
            insightsCount: analysisResult?.insights?.length || 0,
            recommendationsCount: analysisResult?.recommendations?.length || 0,
            nextStepsCount: analysisResult?.nextSteps?.length || 0,
            analysisStatus: analysisResult?.status || 'unknown'
          }
        }
      };

      // 记录完成日志
      const completeLog = this.createLog(
        'Simulation Environment Build Complete',
        `Successfully built simulation environment with ${detailedLogs.length} analysis components`,
        'success'
      );

      return {
        success: true,
        result: {
          environmentStatus: 'Simulation Environment Built',
          challenge: challenge,
          updatedAnalysisResult,
          businessChallengeWithProblems: challenge,
          logs: [startLog, ...detailedLogs, completeLog]
        },
        shouldContinue: true
      };
    } catch (error) {
      console.error('Error building simulation environment:', error);
      
      const errorResult = {
        environmentStatus: 'Failed to build simulation environment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        result: {
          ...errorResult,
          log: this.createLog(
            'Simulation Environment Build Failed',
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