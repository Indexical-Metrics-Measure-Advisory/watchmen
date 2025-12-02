# AI Analysis Steps Architecture

这个目录包含了 AI 分析代理的步骤处理器架构，将原本在 `AIAnalysisAgent.tsx` 中的复杂逻辑拆分为独立的、可重用的步骤处理器。

## 架构概述

### 核心组件

1. **BaseStepProcessor** - 抽象基类，定义了所有步骤处理器的通用接口
2. **StepManager** - 步骤管理器，负责协调和执行所有步骤
3. **具体步骤处理器** - 实现特定业务逻辑的处理器类

### 设计原则

- **单一职责**: 每个步骤处理器只负责一个特定的分析步骤
- **可扩展性**: 通过继承 `BaseStepProcessor` 可以轻松添加新的步骤
- **可测试性**: 每个步骤处理器都可以独立测试
- **松耦合**: 步骤之间通过标准化的上下文和结果接口通信

## 步骤处理器列表

### 1. JudgeChallengeProcessor
- **功能**: 评估保险业务挑战
- **输入**: 业务挑战对象
- **输出**: 评估结果，包括是否为好的挑战、建议等

### 2. QueryHistoryProcessor
- **功能**: 查询历史经验
- **输入**: 业务挑战对象
- **输出**: 相似案例和历史分析结果

### 3. QueryKnowledgeBaseProcessor
- **功能**: 查询知识库
- **输入**: 业务挑战对象
- **输出**: 相关的保险行业知识和分析模型

### 4. BuildSimulationProcessor
- **功能**: 构建业务问题仿真环境
- **输入**: 业务挑战对象
- **输出**: 仿真环境配置和增强的挑战对象



### 5. AnswerBusinessChallengeProcessor
- **功能**: 尝试回答业务挑战
- **输入**: 之前步骤的结果
- **输出**: 挑战答案和推荐方案

### 7. GenerateReportProcessor
- **功能**: 生成分析报告
- **输入**: 所有之前步骤的结果
- **输出**: 最终的分析报告

## 使用方法

### 基本使用

```typescript
import { stepManager } from './steps';

// 设置回调函数
stepManager.setLogCallback((log) => {
  console.log('Step log:', log);
});

stepManager.setStepUpdateCallback((stepId, status, result) => {
  console.log(`Step ${stepId} status: ${status}`);
});

// 执行步骤
const context = {
  businessChallenge: myChallenge,
  analysisResult: currentResult,
  stepContext: {},
  agent: currentAgent
};

const result = await stepManager.executeStep('judgeChallenge', context);
```

### 添加新的步骤处理器

1. 创建新的处理器类，继承 `BaseStepProcessor`:

```typescript
import { BaseStepProcessor, StepExecutionContext, StepExecutionResult } from './BaseStepProcessor';

export class MyCustomProcessor extends BaseStepProcessor {
  stepId = 'myCustomStep';
  stepTitle = 'My Custom Step';
  stepDescription = 'Description of what this step does';

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      // 实现你的业务逻辑
      const result = await doSomething(context.businessChallenge);
      
      return {
        success: true,
        result: {
          ...result,
          log: this.createLog('Success', 'Step completed successfully', 'success')
        },
        shouldContinue: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        shouldContinue: false
      };
    }
  }
}
```

2. 在 `StepManager` 中注册新的处理器:

```typescript
// 在 StepManager 的 initializeProcessors 方法中添加
const processors = [
  // ... 现有处理器
  new MyCustomProcessor()
];
```

## 接口定义

### StepExecutionContext
```typescript
interface StepExecutionContext {
  businessChallenge: BusinessChallenge;
  analysisResult?: any;
  stepContext?: any;
  agent?: any;
}
```

### StepExecutionResult
```typescript
interface StepExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  shouldContinue: boolean;
}
```

## 优势

1. **模块化**: 每个步骤都是独立的模块，便于维护和测试
2. **可重用**: 步骤处理器可以在不同的分析流程中重用
3. **易于扩展**: 添加新步骤只需要创建新的处理器类
4. **统一接口**: 所有步骤都遵循相同的接口规范
5. **错误处理**: 统一的错误处理和日志记录机制
6. **异步支持**: 原生支持异步操作和 Promise

## 迁移说明

原本在 `AIAnalysisAgent.tsx` 中的 `agentSenseAndAct` 函数包含了所有步骤的逻辑，现在这些逻辑被拆分到了各自的处理器中。主要变化：

- 步骤执行逻辑从 switch-case 结构迁移到独立的处理器类
- 状态管理和日志记录通过回调函数统一处理
- 错误处理更加标准化和一致
- 代码结构更加清晰，便于维护和测试