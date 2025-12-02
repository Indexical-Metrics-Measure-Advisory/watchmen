import { BusinessChallenge, BusinessChallengeWithProblems } from '@/model/business';
import { AgentCard } from '@/model/A2ASpec';
import { AIAgentStep } from '../AIAnalysisAgent';

// 步骤执行上下文
export interface StepExecutionContext {
  businessChallenge: BusinessChallenge;
  businessChallengeWithProblems?: BusinessChallengeWithProblems;
  currentAgent: AgentCard;
  analysisResult: any;
  stepIndex: number;
  stepContext?: {
    additionalInfo?: string;
    manualApproval?: boolean;
    retryCount?: number;
  };
}

// 步骤执行结果
export interface StepExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  shouldContinue?: boolean;
  nextStepIndex?: number;
}

// 日志记录接口
export interface LogEntry {
  type: string;
  title: string;
  description: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

// 步骤日志接口
export interface StepLog {
  stepId: string;
  stepTitle: string;
  logs: LogEntry[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
}

// 步骤处理器基类
export abstract class BaseStepProcessor {
  abstract stepId: string;
  abstract stepTitle: string;
  abstract stepDescription: string;

  // 执行步骤的抽象方法
  abstract execute(context: StepExecutionContext): Promise<StepExecutionResult>;

  // 验证步骤是否可以执行
  canExecute(context: StepExecutionContext): boolean {
    return !!context.businessChallenge && !!context.currentAgent;
  }

  // 生成日志条目
  protected createLog(
    title: string,
    description: string,
    status: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): LogEntry {
    return {
      type: this.stepId,
      title,
      description,
      status
    };
  }

  // 处理错误
  protected handleError(error: any): StepExecutionResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      shouldContinue: false
    };
  }

  // 创建成功结果
  protected createSuccessResult(result: any): StepExecutionResult {
    return {
      success: true,
      result,
      shouldContinue: true
    };
  }
}

// 步骤处理器工厂
export class StepProcessorFactory {
  private static processors: Map<string, BaseStepProcessor> = new Map();

  static registerProcessor(processor: BaseStepProcessor): void {
    this.processors.set(processor.stepId, processor);
  }

  static getProcessor(stepId: string): BaseStepProcessor | undefined {
    return this.processors.get(stepId);
  }

  static getAllProcessors(): BaseStepProcessor[] {
    return Array.from(this.processors.values());
  }
}