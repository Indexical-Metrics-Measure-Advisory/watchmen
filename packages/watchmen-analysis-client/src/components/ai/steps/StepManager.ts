import { BaseStepProcessor, StepExecutionContext, StepExecutionResult, StepProcessorFactory } from './BaseStepProcessor';
import { JudgeChallengeProcessor } from './JudgeChallengeProcessor';
import { QueryHistoryProcessor } from './QueryHistoryProcessor';
import { QueryKnowledgeBaseProcessor } from './QueryKnowledgeBaseProcessor';
import { BuildSimulationProcessor } from './BuildSimulationProcessor';

import { AnswerBusinessChallengeProcessor } from './AnswerBusinessChallengeProcessor';
import { GenerateReportProcessor } from './GenerateReportProcessor';
import { AIAgentStep } from '../AIAnalysisAgent';

/**
 * 步骤管理器 - 负责管理和执行所有分析步骤
 */
export class StepManager {
  private processors: Map<string, BaseStepProcessor> = new Map();
  private onLogCallback?: (log: any) => void;
  private onStepUpdateCallback?: (stepId: string, status: AIAgentStep['status'], result?: any) => void;

  constructor() {
    this.initializeProcessors();
  }

  /**
   * 初始化所有步骤处理器
   */
  private initializeProcessors(): void {
    const processors = [
      new JudgeChallengeProcessor(),
      new QueryHistoryProcessor(),
      new QueryKnowledgeBaseProcessor(),
      new BuildSimulationProcessor(),

      new AnswerBusinessChallengeProcessor(),
      new GenerateReportProcessor()
    ];

    processors.forEach(processor => {
      this.processors.set(processor.stepId, processor);
      StepProcessorFactory.registerProcessor(processor);
    });
  }

  /**
   * 设置日志回调函数
   */
  setLogCallback(callback: (log: any) => void): void {
    this.onLogCallback = callback;
  }

  /**
   * 设置步骤更新回调函数
   */
  setStepUpdateCallback(callback: (stepId: string, status: AIAgentStep['status'], result?: any) => void): void {
    this.onStepUpdateCallback = callback;
  }

  /**
   * 执行指定步骤
   */
  async executeStep(stepId: string, context: StepExecutionContext): Promise<StepExecutionResult> {
    const processor = this.processors.get(stepId);
    
    if (!processor) {
      const error = `Unknown step processor: ${stepId}`;
      this.addLog('system', 'Unknown Step Processing', error, 'error');
      return {
        success: false,
        error,
        shouldContinue: false
      };
    }

    // 检查是否可以执行
    if (!processor.canExecute(context)) {
      const error = `Step ${stepId} cannot be executed with current context`;
      this.addLog('system', 'Step Execution Blocked', error, 'warning');
      return {
        success: false,
        error,
        shouldContinue: false
      };
    }

    // 更新步骤状态为进行中
    this.updateStepStatus(stepId, 'in-progress');
    
    // 记录步骤开始
    const contextInfo = context.stepContext?.additionalInfo ? ` (Context: ${context.stepContext.additionalInfo})` : '';
    this.addLog('step_start', processor.stepTitle, `Starting step execution${contextInfo}`, 'info');

    try {
      // 执行步骤
      const result = await processor.execute(context);
      
      // 处理执行结果
      if (result.success) {
        this.updateStepStatus(stepId, 'completed', result.result);
        
        // 如果结果中包含日志，添加到日志中
        if (result.result?.log) {
          this.addLog(
            result.result.log.type,
            result.result.log.title,
            result.result.log.description,
            result.result.log.status
          );
        }
        
        // 如果结果中包含多个日志，添加所有日志
        if (result.result?.logs && Array.isArray(result.result.logs)) {
          result.result.logs.forEach((log: any) => {
            this.addLog(log.type, log.title, log.description, log.status);
          });
        }
      } else {
        this.updateStepStatus(stepId, 'error', result.result);
        
        // 添加错误日志
        if (result.result?.log) {
          this.addLog(
            result.result.log.type,
            result.result.log.title,
            result.result.log.description,
            result.result.log.status
          );
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error executing step ${stepId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateStepStatus(stepId, 'error', { error: errorMessage });
      this.addLog(stepId, 'Step Execution Failed', errorMessage, 'error');
      
      return {
        success: false,
        error: errorMessage,
        shouldContinue: false
      };
    }
  }

  /**
   * 获取所有可用的步骤处理器
   */
  getAllProcessors(): BaseStepProcessor[] {
    return Array.from(this.processors.values());
  }

  /**
   * 获取指定步骤处理器
   */
  getProcessor(stepId: string): BaseStepProcessor | undefined {
    return this.processors.get(stepId);
  }

  /**
   * 添加日志
   */
  private addLog(type: string, title: string, description: string, status: 'info' | 'success' | 'warning' | 'error'): void {
    if (this.onLogCallback) {
      this.onLogCallback({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        status
      });
    }
  }

  /**
   * 更新步骤状态
   */
  private updateStepStatus(stepId: string, status: AIAgentStep['status'], result?: any): void {
    if (this.onStepUpdateCallback) {
      this.onStepUpdateCallback(stepId, status, result);
    }
  }
}

// 导出单例实例
export const stepManager = new StepManager();