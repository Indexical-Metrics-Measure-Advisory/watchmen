# DataMo Trusted Data Platform — 设计文档

> **Watchmen Next Client** · Agent-driven Data Engineering
>
> 目标：让企业数据从"管道灰盒"变成"透明可信的活资产"。

---

## 一、平台定位

DataMo 是一个 **Agent 驱动、全链路可信的数据工程平台**。它不是又一个 ETL 工具或数据目录——它的核心差异在于：

| 传统数据平台 | DataMo Trusted Data Platform |
|---|---|
| 数据进来→出去，中间黑盒 | **全链路可观测**，每个 Topic/Pipeline/Metric 都是一个可感知的节点 |
| schema 靠人工约定 | **AI 主动感知 drift**，自动建议修复方案 |
| 数据质量问题靠人报警 | **实时健康评分**，问题在上游就被发现 |
| AI 只能写 SQL | **Agent 理解业务语义**，知道"GMV 影响什么报表" |
| 敏感数据靠文档约定 | **Govern 引擎内置脱敏策略**，不可旁路 |
| 数据价值不可量化 | **消费端追溯**，每个 Metric 可溯源到原始采集 |
| 出问题才知道 | **实时事件流**，Pipeline failure → 自动评估下游 blast radius |

**一句话：让数据像代码一样被 review、test、deploy——并且被 AI 持续守护。**

---

## 二、核心问题 → 解决方案映射

```
┌─────────────────────────────────────┐
│          7 大核心痛点                │
├─────────────────────────────────────┤
│ ① 数据来源不可追踪 ──────→ Observe (全链路血缘图)         │
│ ② 数据质量不稳定   ──────→ Perceive (AI drift 检测)       │
│ ③ Schema 经常变化  ──────→ Perceive + Feedback (变更审批) │
│ ④ AI 不理解业务语义 ──────→ Model (语义层 + 业务域建模)   │
│ ⑤ 敏感数据不可控   ──────→ Govern (脱敏 + 质量策略引擎)   │
│ ⑥ 数据资产不可量化 ──────→ Observe Catalog (资产价值评估) │
│ ⑦ 缺少实时感知能力 ──────→ Observe Events (实时事件流)    │
└─────────────────────────────────────┘
```

---

## 三、系统架构

### 3.1 模块全景

```
                        Watchmen Next Client
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    User Interface       Agent Layer           Business State
        │                     │                     │
   ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
   │ Observe │←────────→│ Chat    │←────────→│ Store   │
   │ Perceive│  events  │ Panel   │  actions  │ (in-mem │
   │ Ingest  │          │ Log     │          │  state) │
   │ Model   │          └─────────┘          └────┬────┘
   │Transform│                                    │
   │ Govern  │                          ┌─────────┴─────────┐
   │Feedback │                          │    Data Layer     │
   │Settings │                          │ topics, pipelines,│
   └─────────┘                          │ dataSources,      │
                                        │ semanticModels... │
                                        └───────────────────┘
```

### 3.2 数据血缘层级（7 层）

```
消费层  Consumption   ←  chart / alert / subscription
  │
指标层  Metric         ←  metric / metric_ref
  │
语义层  Semantic       ←  semantic_model / semantic_measure
  │
Topic层 Topic          ←  topic / factor (curated)
  │
管道层  Pipeline       ←  pipeline (读取 raw，写入 curated)
  │
原始层  Raw            ←  raw_topic / raw_factor
  │
采集层  Ingest         ←  source_system / source_table / source_field
```

每层节点都有独立的 **健康状态**（healthy / warning / error）和 **元数据**（owner, domain, freshness, volume 等），形成全链路可观测的资产图谱。

### 3.3 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 构建 | Vite + TypeScript | 零配置 HMR，ESM 原生 |
| 状态 | 自研 Store（发布-订阅） | 轻量，无框架依赖，可嵌入任意页面 |
| UI | 原生 CSS（CSS 变量体系） | 零运行时开销，主题化支持 |
| 渲染 | 模板字面量 + innerHTML | 极简架构，无 Virtual DOM overhead |
| Agent | Chat Panel + 事件分发 | 人机协同的对话式交互 |
| 后端对接 | REST / WebSocket（待集成） | 当前为 Mock Data 阶段 |

---

## 四、模块设计

### 4.1 Observe — 全链路可观测引擎

**解决痛点**：① 来源不可追踪 · ⑥ 资产不可量化 · ⑦ 缺少实时感知

```
Observe Page
├── Overview (全局 KPI + Stage 健康概览)
│   ├── Total Assets / Healthy / Warning / Error 指标卡
│   └── 7 层健康条形图
│
├── Catalog (资产目录，支持搜索/过滤/分页)
│   ├── 全局搜索（跨 Stage/Domain/Owner 检索）
│   ├── Stage / Health / Domain / Sort 多维度过滤
│   ├── 分页浏览（pageSize=10，可调）
│   └── 点击任意资产 → 定位到血缘图
│
├── Graph (血缘图谱，三级下钻)
│   ├── Stage View → 7 层网络拓扑
│   ├── Domain View → Stage 内的 Domain 卡片网格
│   └── Node Detail → 单节点详情 + 上下游关系
│
├── Impact (爆炸半径分析)
│   ├── 选定故障节点
│   ├── 自动计算受影响的下游 Topic / Metric / Chart
│   └── 展示最短影响路径
│
└── Events (实时事件流)
    ├── pipeline_failure / freshness_breach / metric_partial_lineage
    ├── Severity / EventType 过滤 + 分页
    └── 关联 impactedMetrics
```

**关键设计原则**：
- **渐进式展示**：Overview（宏观）→ Catalog（搜索定位）→ Graph（血缘探索）→ Impact（故障分析）→ Events（事件追溯）
- **三级下钻**：Stage → Domain → Node，避免 1000+ 节点一次性渲染
- **健康传播**：上游节点 unhealthy → 自动标记下游节点 warning

### 4.2 Perceive — AI 感知与变更管理

**解决痛点**：② 数据质量不稳定 · ③ Schema 经常变化

```
Perceive Page
├── KPI Bar (Pending / Critical / Processed / Confidence)
├── Event Timeline (可过滤 all/pending/processed)
│   └── 每个感知事件显示：
│       ├── 检测标题 + Topic 来源 + 检测时间
│       ├── Severity dot (critical/warning/info)
│       └── AI Confidence 评分
│
└── Change Detail (选定事件的详细面板)
    ├── Drift Metrics (baseline vs current 对比条形图)
    ├── Suggested Changes (字段级变更建议)
    ├── Impact Level (high/medium/low per field)
    └── Action Bar (Approve / Reject)
```

**AI 感知能力**：
- **分布漂移检测**：P50/P95/Mean 在时间窗口内的偏移
- **格式异常检测**：正则模式偏离（如 customer_id 格式突变）
- **字段发现**：源系统新增字段 → 建议同步到 Topic
- **延迟感知**：同步延迟超 SLA → 自动降级告警
- **置信度评分**：每个建议带 0-100% AI 置信度，≥90% 建议自动执行

### 4.3 Feedback — 人机协同决策闭环

**解决痛点**：③ Schema 经常变化（需要人工确认）

```
Perceive Agent 检测到变更
         │
         ▼
   生成感知事件 (Pending)
         │
         ▼
   用户 Approve / Reject
         │
    ┌────┴────┐
    ▼         ▼
 Approved   Rejected
    │         │
    ▼         ▼
执行变更    保持现状
    │         │
    ▼         ▼
 Agent Log 记录决策
    │
    ▼
下次感知周期参考历史决策
```

**关键设计**：
- Approve/Reject 操作记录到 Agent Log
- AI 从历史决策中学习（相同 pattern 下次自动处理）
- 决策可回溯（timestamp + action + scenarioId）

### 4.4 Ingest — 数据采集管理

**解决痛点**：① 来源不可追踪（管好入口）

当前为简单视图。规划扩展：

```
Ingest Page（规划）
├── 数据源管理（MySQL / PostgreSQL / MongoDB / Snowflake / OSS / S3 / ADLS）
├── 连接测试 & 监控
├── 采集策略（全量 / 增量 / CDC）
├── Schema 自动发现
└── 源端字段级血缘锚点
```

### 4.5 Model — 语义建模

**解决痛点**：④ AI 无法理解业务语义

```
Model Page（规划）
├── Topic 定义（raw / meta / distinct / aggregate / time / ratio）
├── Factor（字段）定义与类型标注
├── Business Domain 归类（Commerce / Finance / Risk / ...）
├── Semantic Model（语义模型 = Topic 的业务视角）
├── Semantic Measure（指标 = 字段的聚合表达式）
└── 同义词 / 别名管理（Synonym）
```

**语义层是 AI 理解业务的关键**：
- `paid_amount` 不只是 number，它是"已支付金额，来自 sales_order，聚合为 SUM，属于 Finance 域"
- Agent 可以回答"What contributed to GMV growth?"而非仅仅生成 SQL

### 4.6 Transform — 数据管道

**解决痛点**：⑥ 资产不可量化（管道是数据价值的传输载体）

```
Transform Page（规划）
├── Pipeline 定义（insert / merge / insert-or-merge / delete）
├── Pipeline 监控（启用/禁用、验证状态、最近执行时间）
├── Pipeline 血缘（reads_from → writes_to 关系）
└── Pipeline 与 Observe Graph 的节点联动
```

### 4.7 Govern — 数据治理引擎

**解决痛点**：⑤ 敏感数据不可控

```
Govern Page（规划）
├── Quality Rules（质量检测规则）
│   ├── 值域检查（amount > 0）
│   ├── 格式检查（regex 匹配）
│   ├── 重复检测
│   ├── 新鲜度 SLA（数据延迟阈值）
│   └── 完整性检查（非空率）
│
├── Masking Policies（脱敏策略）
│   ├── 字段级脱敏（SHA256 / 部分掩码 / 完全隐藏）
│   ├── 角色策略（Admin / Analyst / Viewer）
│   └── 不可旁路（Govern 引擎在输出层强制拦截）
│
├── Retention Policies（数据生命周期）
│   ├── 热数据 / 温数据 / 冷数据分层
│   └── 自动归档 & 删除
│
└── Compliance Audit（合规审计）
    ├── 访问日志
    ├── 变更记录
    └── 合规报告
```

### 4.8 Agent — AI 对话式交互

```
Agent Panel
├── Activity Log（实时 Agent 日志流）
│   ├── Detect → Analyze → Suggest → User Action
│   └── 彩色圆点 + 分类标签
│
├── Chat Input（对话式查询）
│   ├── 自然语言 → Agent 理解 →
│   │   ├── "show me all failing pipelines" → 跳转到 Events
│   │   ├── "what's the impact on GMV" → 跳转到 Impact
│   │   └── "who owns topic sales_order" → 定位到 Catalog
│   └── Suggested Actions（Agent 主动推送）
│
└── Collapsible（可折叠面板，不阻塞主视图）
```

---

## 五、数据流架构

```
                             ┌──── Perceive: AI Drift Detection ────┐
                             │                                      │
  ┌──────────┐    ┌──────────▼────┐    ┌──────────┐    ┌──────────┐
  │  Source  │───▶│  Ingest       │───▶│  Raw     │───▶│ Pipeline │
  │  Systems │    │  (采集层)     │    │  Topic   │    │  (管道层) │
  └──────────┘    └───────────────┘    └──────────┘    └─────┬────┘
                                                             │
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────▼──┐
  │Consumers │◀───│ Metric   │◀───│ Semantic │◀───│  Topic     │
  │(报表/告警)│    │ (指标层) │    │  Model   │    │  (curated) │
  └──────────┘    └──────────┘    └──────────┘    └────────────┘
       │
       ▼
  ┌────────────────────────────────────────────────────┐
  │              Observe: 全链路追踪                     │
  │  - 每个节点有健康状态                                 │
  │  - 每条边有关系类型                                   │
  │  - 故障自动计算爆炸半径                               │
  └────────────────────────────────────────────────────┘
```

---

## 六、实现路线图

### Phase 1：原型验证 ✅（当前阶段）

- [x] 基础 UI Shell（侧边导航 + 内容区 + Agent 面板）
- [x] Observe 全链路（Overview / Catalog / Graph / Impact / Events）
- [x] Perceive 感知引擎（Timeline + Change Detail + Approve/Reject）
- [x] Ingest / Model / Transform / Govern / Feedback 占位页面
- [x] Agent Chat Panel + Activity Log
- [x] 三级图下钻（Stage → Domain → Node）
- [x] 搜索、过滤、分页
- [x] 全局搜索跨资产检索

### Phase 2：后端集成（待实现）

- [ ] REST API 对接，替换 Mock Data
- [ ] WebSocket 实时事件推送
- [ ] 认证 & 鉴权
- [ ] 多租户支持

### Phase 3：深度功能（待实现）

- [ ] Perceive：AI 模型接入真实 drift 检测
- [ ] Model：语义建模完整编辑器
- [ ] Govern：脱敏策略可视化配置
- [ ] Transform：Pipeline DAG 可视化编辑
- [ ] Ingest：Schema 自动发现 + CDC 配置

### Phase 4：企业级能力（待实现）

- [ ] Dashboard 自定义
- [ ] 报表导出（PDF / Excel）
- [ ] Webhook 告警集成（Slack / PagerDuty / 钉钉）
- [ ] RBAC 细粒度权限
- [ ] 审计日志持久化
- [ ] 多集群部署

---

## 七、设计原则

1. **Progressive Disclosure（渐进式展示）**
   - 全局概览 → 搜索定位 → 深层探索 → 细节分析
   - 100+ 采集、1000+ Topic、100+ 指标 → 始终可导航

2. **Health-First（健康优先）**
   - 所有资产都有健康状态（Healthy / Warning / Error）
   - 上游故障 → 下游自动标记
   - 颜色编码：绿/橙/红

3. **Agent-Centric（Agent 驱动）**
   - AI 不只是工具，是平台的核心参与者
   - 检测 → 分析 → 建议 → 执行 → 学习，闭环运转

4. **Zero-Framework（零框架依赖）**
   - 原生 TypeScript + Vite + CSS Variables
   - 可嵌入任何页面（通过 `window.mountWatchmenUI(container)`）
   - 体积小、启动快、无运行时开销

5. **Source-of-Truth（唯一真相来源）**
   - 所有数据资产在平台内统一建模
   - 从采集到消费，一条血缘链
   - 没有平台外的"约定文档"