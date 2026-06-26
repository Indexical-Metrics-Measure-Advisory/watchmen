# Ontology Control Plane - 项目结构总结

## 完整目录结构

```
watchmen-ai-copilot/src/watchmen_ai/auto/
│
├── __init__.py                    # 包导出
├── __main__.py                    # CLI 入口
├── README.md                      # 项目文档
├── example.py                     # 使用示例
│
├── core/                          # 核心数据模型
│   ├── __init__.py
│   ├── ontology.py               # BusinessOntology, OntologyNode, OntologyRelation
│   ├── proposal.py               # Proposal, ProposalAction, ProposalStatus
│   ├── decision.py               # Decision, DecisionOutcome
│   └── audit.py                  # AuditEvent, AuditAction
│
├── agents/                        # 4 个核心 Agent
│   ├── __init__.py
│   ├── base.py                   # BaseOntologyAgent (统一循环基类)
│   ├── architect.py              # Ontology Architect Agent
│   ├── materialization.py        # Ontology Materialization Agent
│   ├── health.py                 # Ontology Health Agent
│   └── insight.py                # Ontology Insight Agent
│
├── skills/                        # 可复用技能库
│   ├── __init__.py
│   ├── metadata_scanner.py       # 元数据扫描
│   ├── quality_checker.py        # 数据质量检查
│   ├── pattern_analyzer.py       # 模式分析
│   └── pipeline_generator.py     # 管道生成
│
├── control_plane.py              # 统一编排入口
└── router.py                     # REST API 路由
```

## 核心概念

### 1. Business Ontology (业务本体)
- 数据团队的"操作系统内核"
- 不是元数据目录，而是统一对象模型
- 包含：Nodes (业务对象)、Relations (关系)、Attributes (属性)

### 2. 四个 Agent (统一循环)

```
Observe → Discover → Reason → Propose → Approve → Materialize → Monitor → Learn
```

| Agent | 职责 | 输入 | 输出 |
|-------|------|------|------|
| **Architect** | 发现新业务对象 | 元数据 | 新 Node/Relation |
| **Materialization** | 物化数据管道 | Ontology 变更 | 数据管道定义 |
| **Health** | 监控健康度 | 数据质量指标 | 健康评分 |
| **Insight** | 发现业务洞察 | 业务模式 | 新 Segment/Tag |

### 3. Proposal (提案)
- Agent 生成的变更建议
- 包含：action, rationale, confidence
- 状态：pending → approved/rejected → materialized

### 4. Skills (技能)
- 可复用的能力模块
- 被 Agent 调用执行具体任务
- 例如：MetadataScanner, QualityChecker

## 使用方式

### Python API

```python
from watchmen_ai.auto import OntologyControlPlane

# 初始化
cp = OntologyControlPlane()

# 运行完整循环
results = cp.run_full_cycle(auto_approve=True)

# 运行特定 agent
proposals = cp.run_agent("architect", auto_approve=True)

# 获取 ontology
ontology = cp.get_ontology()

# 查看待审批提案
pending = cp.get_pending_proposals()

# 人工审批
cp.approve_proposal("prop-xxx", approved=True, reason="Valid")
```

### CLI

```bash
# 运行完整循环
python -m watchmen_ai.auto run-cycle --auto-approve

# 运行特定 agent
python -m watchmen_ai.auto run-agent architect --auto-approve

# 查看状态
python -m watchmen_ai.auto status

# 查看待审批提案
python -m watchmen_ai.auto pending

# 审批提案
python -m watchmen_ai.auto approve <proposal_id> --reason "Valid"

# 查看审计日志
python -m watchmen_ai.auto audit --limit 20

# 导出/导入 ontology
python -m watchmen_ai.auto export -o ontology.json
python -m watchmen_ai.auto import ontology.json
```

### REST API

```bash
# 获取 ontology
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
  "reason": "Valid"
}

# 查看审计日志
GET /ontology-control-plane/audit-log
```

## 数据流示例

### Architect Agent 工作流

```
1. Observe
   └─> 扫描元数据（tables, topics）

2. Discover
   └─> 发现新对象（customer_coupon, coupon_campaign）

3. Reason
   └─> 推断业务概念（Coupon, Campaign）

4. Propose
   └─> 生成提案：
       - ADD NODE: Coupon
       - ADD NODE: Campaign
       - ADD RELATION: Customer -> uses -> Coupon

5. Approve
   └─> 自动/人工审批

6. Materialize
   └─> 更新 Ontology

7. Monitor
   └─> 验证变更成功

8. Learn
   └─> 记录审计日志
```

## 扩展指南

### 添加新 Agent

1. 在 `agents/` 创建新文件
2. 继承 `BaseOntologyAgent`
3. 实现 4 个方法：`observe()`, `discover()`, `reason()`, `materialize()`
4. 在 `control_plane.py` 注册
5. 在 `__init__.py` 导出

### 添加新 Skill

1. 在 `skills/` 创建新文件
2. 实现技能方法
3. 在需要的 Agent 中注入使用
4. 在 `__init__.py` 导出

### 添加新数据源

1. 扩展 `MetadataScanner` 技能
2. 添加新的扫描方法
3. 在 `ArchitectAgent.observe()` 中调用

## 关键设计决策

1. **统一循环模式**: 所有 Agent 遵循相同的 Observe→Materialize 循环
2. **Proposal 机制**: 变更通过提案系统，支持自动/人工审批
3. **技能复用**: Skills 是独立的可复用模块
4. **审计追踪**: 所有变更都有审计日志
5. **Ontology 即内核**: 数据质量、血缘等都是 Ontology 的属性，不是独立模块

## 下一步开发

- [ ] 集成真实的元数据源（watchmen-meta）
- [ ] 实现数据质量检查逻辑
- [ ] 添加 LLM 辅助推理（使用 watchmen-ai 的模型）
- [ ] 实现数据管道生成（集成 watchmen-pipeline）
- [ ] 添加 Web UI 界面
- [ ] 实现持久化存储（ontology, proposals, audit）
- [ ] 添加权限控制
- [ ] 实现多租户支持
