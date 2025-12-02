# 后台API接口规范文档

基于 Index.tsx 页面逻辑提取的后台构建API接口规范

## 基础配置

### API基础信息
- **基础URL**: `http://localhost:8900`
- **认证方式**: Bearer Token (PAT)
- **数据格式**: JSON
- **请求头**: 
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "pat {token}"
  }
  ```

## 核心API接口

### 1. 仪表板数据API

#### 1.1 获取代理列表
```http
GET /agent/list/
```

**响应数据结构**:
```typescript
interface AgentCard {
  id: string;
  name: string;
  description: string;
  role: string;
  lastActive?: string; // ISO 8601 格式
  capabilities: Array<{
    name: string;
    description: string;
    type: 'action' | 'knowledge';
  }>;
  supportedContentTypes: string[];
  metadata?: {
    businessChallengeId?: string;
  };
}
```

**业务逻辑**:
- 用于计算运行中的代理数量
- 判断代理是否运行中：`lastActive` 时间在5分钟内

#### 1.2 获取业务挑战列表
```http
GET /challenges
```

**响应数据结构**:
```typescript
interface BusinessChallenge {
  id: string;
  title: string;
  description: string;
  problemIds: string[];
  createdAt: string; // ISO 8601 格式
}
```

**业务逻辑**:
- 用于统计总挑战数量
- 显示在仪表板概览中

### 2. 业务挑战管理API

#### 2.1 创建业务挑战
```http
POST /challenge/create
```

**请求体**:
```typescript
interface CreateChallengeRequest {
  title: string;
  description: string;
  problemIds?: string[];
}
```

#### 2.2 更新业务挑战
```http
POST /challenge/update
```

**请求体**:
```typescript
interface UpdateChallengeRequest {
  id: string;
  title?: string;
  description?: string;
  problemIds?: string[];
}
```

#### 2.3 获取单个业务挑战
```http
GET /challenge/{challenge_id}
```

#### 2.4 获取完整业务挑战信息
```http
GET /challenge/full/{challenge_id}
```

**响应数据结构**:
```typescript
interface BusinessChallengeWithProblems extends BusinessChallenge {
  problems: BusinessProblem[];
}
```

#### 2.5 获取业务问题列表
```http
GET /problems
```

**响应数据结构**:
```typescript
interface BusinessProblem {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  hypothesisIds: string[];
  createdAt: string;
}
```

### 3. AI代理管理API

#### 3.1 启动代理
```http
GET /challenge/agent/start/{businessChallengeId}
```

**业务逻辑**:
- 为特定业务挑战启动AI代理
- 代理开始分析和生成报告

#### 3.2 获取单个代理信息
```http
GET /agent/{agentId}/
```

#### 3.3 代理注册/更新
```http
POST /agent/register
```

**请求体**:
```typescript
interface AgentRegistrationRequest {
  id: string;
  name: string;
  description: string;
  role: string;
  capabilities: Array<{
    name: string;
    description: string;
    type: 'action' | 'knowledge';
  }>;
  supportedContentTypes: string[];
  metadata?: Record<string, any>;
}
```

### 4. 智能分析API

#### 4.1 消息类型分析
```http
POST /chat/analyze-message-type
```

**请求体**:
```typescript
interface MessageAnalysisRequest {
  content: string;
}
```

**响应**:
```typescript
interface MessageAnalysisResponse {
  type: 'challenge' | 'business' | 'hypothesis' | 'general';
  confidence: number;
  keywords: string[];
}
```

#### 4.2 生成分析报告
```http
POST /chat/generate-analysis
```

**请求体**:
```typescript
interface AnalysisRequest {
  messageContent: string;
  analysisType: 'challenge' | 'business' | 'hypothesis' | 'general';
  context?: {
    challengeId?: string;
    agentId?: string;
  };
}
```

**响应**:
```typescript
interface AnalysisResponse {
  content: string;
  metadata: {
    ragSources: string[];
    thinkingSteps: string[];
    processingTime: number;
  };
  reportSections: {
    overview: string;
    keyInsights: string[];
    recommendations: string[];
  };
}
```

## 数据模型定义

### 聊天消息模型
```typescript
interface ChatMessage {
  type: 'user' | 'assistant' | 'thinking';
  content: string;
  metadata?: {
    ragSources?: string[];
    thinkingSteps?: string[];
    processingTime?: number;
  };
}
```

### 任务管理模型
```typescript
interface Task {
  id: string;
  clientAgentId: string;
  remoteAgentId: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  artifacts: Artifact[];
  messages: Message[];
}

interface Message {
  id: string;
  taskId: string;
  senderId: string;
  receiverId: string;
  type: 'context' | 'reply' | 'artifact' | 'instruction';
  content: string;
  parts?: MessagePart[];
  createdAt: string;
}

interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

## 错误处理

### 标准错误响应格式
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  path: string;
}
```

### 常见错误码
- `CHALLENGE_NOT_FOUND`: 业务挑战不存在
- `AGENT_NOT_FOUND`: 代理不存在
- `INVALID_REQUEST`: 请求参数无效
- `AUTHENTICATION_FAILED`: 认证失败
- `RATE_LIMIT_EXCEEDED`: 请求频率超限

## 实现优先级

### 高优先级 (P0)
1. 仪表板数据API (`/agent/list/`, `/challenges`)
2. 业务挑战基础CRUD (`/challenge/*`)
3. 代理管理基础功能 (`/agent/*`)

### 中优先级 (P1)
1. 智能分析API (`/chat/*`)
2. 任务管理功能
3. 消息处理系统

### 低优先级 (P2)
1. 高级分析功能
2. 实时通知
3. 性能优化

## 技术要求

### 性能要求
- API响应时间 < 500ms (P95)
- 支持并发请求 > 100 QPS
- 数据库查询优化

### 安全要求
- 所有API需要认证
- 输入参数验证
- SQL注入防护
- XSS防护

### 监控要求
- API调用日志
- 错误率监控
- 性能指标收集
- 业务指标统计

## 部署配置

### 环境变量
```bash
API_BASE_URL=http://localhost:8900
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
LOG_LEVEL=info
```

### 依赖服务
- PostgreSQL 数据库
- Redis 缓存
- 消息队列 (可选)
- 文件存储 (可选)

---

*此文档基于 Index.tsx 页面的前端逻辑提取，为后台开发提供完整的API接口规范。*