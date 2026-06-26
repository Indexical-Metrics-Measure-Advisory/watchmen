# Ontology Control Plane

AI-driven ontology evolution system that automatically discovers, materializes, monitors, and evolves business ontologies.

## Architecture

```
Ontology Control Plane
│
├── Ontology Architect Agent      # 发现新的业务对象和关系
├── Ontology Materialization Agent # 将 ontology 物化为数据管道
├── Ontology Health Agent          # 监控和维护 ontology 健康度
├── Ontology Insight Agent         # 发现业务洞察和新概念
│
├── Business Ontology              # 统一对象模型
├── Decision Store                 # 治理决策记录
├── Audit Store                    # 变更审计日志
├── Skill Library                  # 可复用技能库
└── Governance Workflow            # 审批工作流
```

## Unified Agent Loop

All agents follow the same loop pattern:

```
Observe → Discover → Reason → Propose → Approve → Materialize → Monitor → Learn
```

1. **Observe**: 观察当前状态（元数据、数据质量、模式等）
2. **Discover**: 发现异常、机会或变化
3. **Reason**: 推理并生成提案
4. **Propose**: 提交提案等待审批
5. **Approve**: 审批提案（自动或人工）
6. **Materialize**: 将批准的提案应用到 ontology
7. **Monitor**: 验证物化结果
8. **Learn**: 从结果中学习

## Agents

### 1. Ontology Architect Agent

**职责**: 发现新的业务对象、关系和属性

**Loop**:
```
扫描元数据 → 发现新对象 → 匹配现有 Ontology → 不存在 → 生成 Proposal → 审批 → 更新 Ontology
```

**示例**:
- 发现 `customer_coupon`, `coupon_campaign`, `coupon_redemption` 表
- 推断出 `Coupon` 和 `Campaign` 是新的业务对象
- 生成提案:
  ```
  ADD NODE: Coupon
  ADD NODE: Campaign
  ADD RELATION: Customer -> uses -> Coupon
  ```

### 2. Ontology Materialization Agent

**职责**: 将 Ontology 变成实际数据

**Loop**:
```
发现 Ontology 变化 → 发现缺失数据源 → 生成采集任务 → 生成 CDC/ETL → 验证映射 → 更新血缘
```

**示例**:
- Ontology 新增 `Customer participates Campaign` 关系
- Agent 检查发现 `Campaign` 对象没有数据
- 自动生成:
  ```
  ods_campaign
  dwd_campaign
  dm_campaign
  ```

### 3. Ontology Health Agent

**职责**: 监控 Ontology 健康度

**Loop**:
```
扫描 Ontology → 检查数据质量 → 检查血缘 → 检查时效 → 发现异常 → 修复 → 更新健康状态
```

**健康指标**:
- **Completeness** (完整率): > 98%
- **Freshness** (及时率): < 1 day
- **Uniqueness** (唯一率): > 99.9%
- **Consistency** (一致率): > 95%

**示例**:
```
Customer:
  Completeness: 99.8%
  Freshness: 95%
  Consistency: 98%
  Health Score: 87
```

### 4. Ontology Insight Agent

**职责**: 发现业务洞察、新指标、新标签、新集市

**Loop**:
```
分析业务行为 → 发现模式 → 发现业务概念 → 推荐资产 → 审批 → 加入 Ontology
```

**示例**:
- 发现 `premium > 10000` 且 `claim_count = 0` 经常出现
- 判断 `High Value Customer` 已形成业务概念
- 生成:
  ```
  ADD NODE: Customer Segment
  ADD INSTANCE: High Value Customer
  ```
- 同时生成 Tag, Metric, Feature

## Skills

可复用的技能库，供 agents 调用：

- **MetadataScanner**: 扫描元数据源（数据库、主题、API）
- **QualityChecker**: 检查数据质量指标
- **PatternAnalyzer**: 分析数据模式发现业务概念
- **PipelineGenerator**: 生成数据管道定义（CDC、ETL）

## Usage

### Python API

```python
from watchmen_ai.auto import OntologyControlPlane

# 初始化 control plane
control_plane = OntologyControlPlane()

# 运行完整循环（所有 agents）
results = control_plane.run_full_cycle(auto_approve=True)

# 或运行特定 agent
proposals = control_plane.run_agent("architect", auto_approve=True)

# 获取当前 ontology
ontology = control_plane.get_ontology()

# 查看待审批提案
pending = control_plane.get_pending_proposals()

# 人工审批提案
control_plane.approve_proposal(
    proposal_id="prop-xxx",
    approved=True,
    reason="Valid business object"
)

# 查看审计日志
audit = control_plane.get_audit_log()
```

### REST API

```bash
# 获取当前 ontology
GET /ontology-control-plane/ontology

# 运行完整循环
POST /ontology-control-plane/run-cycle?auto_approve=true

# 运行特定 agent
POST /ontology-control-plane/run-agent
{
  "agent_type": "architect",
  "auto_approve": true
}

# 查看待审批提案
GET /ontology-control-plane/pending-proposals

# 审批提案
POST /ontology-control-plane/proposals/{proposal_id}/approve
{
  "approved": true,
  "reason": "Valid business object"
}

# 查看审计日志
GET /ontology-control-plane/audit-log

# 列出所有 agents
GET /ontology-control-plane/agents
```

### CLI

```bash
# 运行完整循环
python -m watchmen_ai.auto.cli run-cycle --auto-approve

# 运行特定 agent
python -m watchmen_ai.auto.cli run-agent architect --auto-approve

# 查看 ontology 状态
python -m watchmen_ai.auto.cli status

# 查看待审批提案
python -m watchmen_ai.auto.cli pending

# 审批提案
python -m watchmen_ai.auto.cli approve <proposal_id> --reason "Valid"

# 查看审计日志
python -m watchmen_ai.auto.cli audit --limit 20
```

## Data Quality as Ontology Attribute

数据质量不是独立模块，而是 Ontology 的属性：

```
Ontology Node: Customer
│
├── Definition
├── Metrics
├── Lineage
├── Owner
├── Quality Rules
└── Health Score
```

## Evolution Loop

整个系统的统一循环：

```
Business Ontology
       ↓
发现变化
       ↓
生成资产
       ↓
运行资产
       ↓
监控质量
       ↓
产生洞察
       ↓
演化 Ontology
       ↓
Business Ontology
```

## Key Concepts

- **Business Ontology**: 数据团队的"操作系统内核"，不是元数据目录
- **Projection**: 指标、标签、特征、数据集市、数据质量规则、血缘、数据产品都是 Ontology 的不同投影
- **Unified Object Model**: 整个数据团队围绕统一对象模型持续闭环演化

## Development

### Adding a New Agent

1. Create agent class in `agents/` directory
2. Inherit from `BaseOntologyAgent`
3. Implement: `observe()`, `discover()`, `reason()`, `materialize()`
4. Register in `control_plane.py`
5. Add to `__init__.py` exports

### Adding a New Skill

1. Create skill class in `skills/` directory
2. Implement skill methods
3. Inject into agents that need it
4. Add to `__init__.py` exports

## Example

See `example.py` for a complete working example:

```bash
python -m watchmen_ai.auto.example
```
