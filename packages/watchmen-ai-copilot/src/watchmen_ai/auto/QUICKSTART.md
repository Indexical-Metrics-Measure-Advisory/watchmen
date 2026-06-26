# 快速开始指南

## 1. 安装依赖

```bash
cd packages/watchmen-ai-copilot
poetry install
```

## 2. 运行示例

### 方式一：Python 脚本

```bash
python -m watchmen_ai.auto.example
```

### 方式二：CLI 命令

```bash
# 查看帮助
python -m watchmen_ai.auto --help

# 查看 ontology 状态
python -m watchmen_ai.auto status

# 运行 Architect Agent
python -m watchmen_ai.auto run-agent architect --auto-approve

# 运行完整循环
python -m watchmen_ai.auto run-cycle --auto-approve

# 查看待审批提案
python -m watchmen_ai.auto pending

# 查看审计日志
python -m watchmen_ai.auto audit --limit 20
```

### 方式三：REST API

启动服务：
```bash
uvicorn watchmen_ai.main:app --reload
```

访问 API：
```bash
# 查看 ontology
curl http://localhost:8000/ontology-control-plane/ontology

# 运行完整循环
curl -X POST "http://localhost:8000/ontology-control-plane/run-cycle?auto_approve=true"

# 运行特定 agent
curl -X POST "http://localhost:8000/ontology-control-plane/run-agent" \
  -H "Content-Type: application/json" \
  -d '{"agent_type": "architect", "auto_approve": true}'

# 查看待审批提案
curl http://localhost:8000/ontology-control-plane/pending-proposals

# 查看审计日志
curl http://localhost:8000/ontology-control-plane/audit-log
```

## 3. 基本使用流程

### 3.1 初始化 Ontology

```python
from watchmen_ai.auto import OntologyControlPlane, BusinessOntology

# 创建空的 ontology
ontology = BusinessOntology(
    ontology_id="my-ontology",
    name="My Business Ontology",
    description="Business objects and relationships"
)

# 初始化 control plane
cp = OntologyControlPlane(ontology=ontology)
```

### 3.2 添加初始节点

```python
from watchmen_ai.auto import OntologyNode

# 添加 Customer 节点
customer = OntologyNode(
    node_id="customer",
    name="Customer",
    description="客户信息",
    node_type="business_object",
    attributes={
        "domain": "CRM",
        "owner": "Data Team"
    }
)
ontology.add_node(customer)
```

### 3.3 运行 Agent

```python
# 运行 Architect Agent 发现新对象
proposals = cp.run_agent("architect", auto_approve=True)

# 查看生成的提案
for p in proposals:
    print(f"Action: {p.action}")
    print(f"Rationale: {p.rationale}")
    print(f"Confidence: {p.confidence}")
```

### 3.4 人工审批（可选）

```python
# 查看待审批提案
pending = cp.get_pending_proposals()

# 审批提案
cp.approve_proposal(
    proposal_id="prop-xxx",
    approved=True,
    reason="Valid business object"
)
```

### 3.5 查看结果

```python
# 查看更新后的 ontology
ontology = cp.get_ontology()
print(f"Nodes: {len(ontology.nodes)}")
print(f"Relations: {len(ontology.relations)}")

# 查看审计日志
audit = cp.get_audit_log()
for event in audit:
    print(f"{event.timestamp}: {event.action}")
```

## 4. 实际场景示例

### 场景：发现新的业务对象

```python
from watchmen_ai.auto import OntologyControlPlane

# 初始化
cp = OntologyControlPlane()

# 假设元数据扫描发现了新表
# - customer_coupon
# - coupon_campaign
# - coupon_redemption

# 运行 Architect Agent
proposals = cp.run_agent("architect", auto_approve=True)

# Agent 会自动推断出：
# - Coupon (业务对象)
# - Campaign (业务对象)
# - Customer -> uses -> Coupon (关系)

# 查看结果
ontology = cp.get_ontology()
for node in ontology.nodes.values():
    print(f"Node: {node.name}")
```

### 场景：监控数据质量

```python
# 运行 Health Agent
proposals = cp.run_agent("health", auto_approve=True)

# 查看健康评分
for node in ontology.nodes.values():
    if node.health:
        print(f"{node.name}: {node.health.overall_score}")
```

### 场景：发现业务洞察

```python
# 运行 Insight Agent
proposals = cp.run_agent("insight", auto_approve=True)

# Agent 可能会发现：
# - High Value Customer (客户分群)
# - Premium Segment (高端客户)
```

## 5. 扩展开发

### 添加自定义 Skill

```python
from watchmen_ai.auto.skills import BaseSkill

class MyCustomSkill(BaseSkill):
    def execute(self, context):
        # 实现自定义逻辑
        return {"result": "success"}

# 在 Agent 中使用
from watchmen_ai.auto.agents import ArchitectAgent

agent = ArchitectAgent()
agent.skills.append(MyCustomSkill())
```

### 添加自定义 Agent

```python
from watchmen_ai.auto.agents import BaseOntologyAgent

class MyCustomAgent(BaseOntologyAgent):
    def observe(self, context):
        # 观察阶段
        return {"data": "observed"}
    
    def discover(self, context):
        # 发现阶段
        return {"patterns": []}
    
    def reason(self, context):
        # 推理阶段
        return {"proposals": []}
    
    def materialize(self, context):
        # 物化阶段
        return {"result": "success"}

# 注册到 Control Plane
cp.register_agent("custom", MyCustomAgent())
```

## 6. 常见问题

### Q: 如何持久化 ontology？

```python
import json

# 导出
ontology_dict = ontology.to_dict()
with open("ontology.json", "w") as f:
    json.dump(ontology_dict, f)

# 导入
with open("ontology.json", "r") as f:
    ontology_dict = json.load(f)
ontology = BusinessOntology.from_dict(ontology_dict)
```

### Q: 如何集成真实的元数据源？

实现 `MetadataScanner` 技能：

```python
from watchmen_ai.auto.skills import MetadataScanner

class WatchmenMetadataScanner(MetadataScanner):
    def scan(self, source):
        # 从 watchmen-meta 获取元数据
        # 返回 tables, topics 等
        pass
```

### Q: 如何添加 LLM 辅助推理？

在 Agent 的 `reason` 阶段集成 LLM：

```python
from watchmen_ai.llm import get_llm

class LLMArchitectAgent(ArchitectAgent):
    def reason(self, context):
        llm = get_llm()
        prompt = f"Based on these patterns: {context['patterns']}, suggest new business objects."
        response = llm.invoke(prompt)
        # 解析 LLM 响应生成 proposals
        return {"proposals": proposals}
```

## 7. 下一步

- 查看完整文档：`README.md`
- 查看项目结构：`PROJECT_STRUCTURE.md`
- 运行测试：`pytest tests/auto/`
- 贡献代码：参考 `CONTRIBUTING.md`
