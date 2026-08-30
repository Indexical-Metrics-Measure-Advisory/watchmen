# User Cases — 感知 → 治理 → 本体 全链路

> Watchmen Next Client · Ontology-Driven Data Platform
>
> 本文定义平台的完整用户 case 集，是「所有感知到的变化都必须关联到数据治理与 Ontology」这一原则的验收标准。每条 case 标注角色、触发、关联链、批准后的可见变化与 UI 验收路径。

---

## 角色定义

| 角色 | 关注点 | 主要页面 |
|---|---|---|
| **Data Steward**（治理者） | 质量规则、脱敏策略、术语、敏感级 | Perceive、Govern、Ontology 对象详情 |
| **Data Engineer**（建设者） | Topic、管道、物化健康 | Perceive、Transform、Observe |
| **Data Architect**（架构师） | 对象/关系建模、覆盖率 | Ontology、Model |
| **Business Analyst**（消费者） | 指标可信度、影响范围 | Observe、Ontology |

---

## 核心不变式

**每一条感知事件（PerceiveScenario）都必须携带三向关联：**

1. **Ontology Impact** — `affectedObjectIds` + `affectedAttributes`（影响哪些对象/属性，含"拟新增"属性）
2. **Governance Impact** — `relatedRuleIds` + `relatedPolicyIds` + `relatedTermIds`（触及哪些质量规则/脱敏策略/术语）
3. **Applied Effects** — 每个 `proposedChanges[].effect`（批准后哪些治理资产发生什么变化）

即使某条事件只有平台级影响（如延迟恢复），UI 也要显式声明 "No governance impact — platform-level change only"，不允许留空。

---

## UC-1 分布漂移 → 规则参数提案

**角色**：Data Steward · **触发**：perceive-1「Order Amount Distribution Drift」（critical, AI 92%）

**关联链**：
- Ontology：`Sales Order.paid_amount`、`Payment.paid_amount`（两个对象同时受影响）
- Governance：规则 gr-1（Order Amount > 0，params: threshold=1200, drift_window=7d）、规则 gr-8（GMV 一致性）；术语 GMV / Paid Amount

**批准后**：gr-1.params → threshold=1600, drift_window=14d，规则行出现 `⟳ updated by perceive-1` 溯源徽章；Agent Log 记录 "Applied effect: rule gr-1 params updated"。

**验收路径**：Perceive → 选中 perceive-1 → 右列 Ontology Impact 看到 2 个对象及属性治理徽章 → Governance Impact 看到 gr-1 当前参数 → Approve → 切到 Govern → gr-1 行显示新 params chips 与溯源徽章 → 回 Ontology 打开 Sales Order → Quality Rules 区块 gr-1 仍在（参数已更新）。

---

## UC-2 格式异常 → 规则参数 + 术语定义冲突

**角色**：Data Steward · **触发**：perceive-2「Customer ID Format Anomalies」（warning, AI 87%）

**关联链**：
- Ontology：`Sales Order.customer_id`（masked · tokenize）、`Customer.user_id`
- Governance：规则 gr-2（params: regex=`^CUST-\d{8}$`, action=reject）、策略 mp-2、**术语 "Customer ID"（定义恰好规定 8 位格式 → 与放宽 regex 的提案构成 definition conflict，UI 红色虚线徽章高亮）**

**批准后**：gr-2.params → regex=`^CUST-\d{8,12}$`, action=quarantine；术语 gt-customer-id 转 **draft** 并更新定义为 8/12 位兼容；Govern 术语表显示该术语需评审。

**验收路径**：Perceive → perceive-2 → Suggested Changes 第三项带 `TERM Customer ID · definition conflict` 徽章 → Governance Impact 中术语行显示 conflict 徽章 → Approve → Govern 页确认 gr-2 新参数 + 术语 Customer ID 变 draft（新定义）。

---

## UC-3 新字段发现 → 本体新属性

**角色**：Data Engineer / Architect · **触发**：perceive-3（approved 历史样例）与 perceive-6「New Field Suggestion: region on user_profile」（pending, AI 94%）

**关联链**：
- Ontology：对象 `Customer` 拟新增属性 `region`（UI 显示 `+ region [proposed]` 徽章，属性尚不存在）；perceive-3 的 payment_method 已作为属性落在 Sales Order 对象上（闭环结果样例）
- Governance：无规则/策略影响 → 显式展示术语关联（payment_method → 术语 Payment Method）

**批准后（perceive-6）**：Customer 对象属性表新增 `region` 行（effect: add_attribute）；Agent Log 记录；对象属性数与 Overview KPI 同步更新。

**验收路径**：Ontology → Customer 详情 → Open Proposals 区块看到 perceive-6 → Review 跳转 Perceive（自动选中）→ 确认 Ontology Impact 显示 `+ region proposed` → Approve → 回 Customer 详情 → 属性表出现 Region 行。

---

## UC-4 敏感未掩码 → 脱敏策略提案

**角色**：Data Steward · **触发**：perceive-5「Sensitive Field Without Masking: payment_method」（warning, AI 89%）

**关联链**：
- Ontology：`Payment.payment_method`（治理徽章显示 masked off / 暴露缺口）
- Governance：策略 mp-4（disabled 状态）→ 提案新增策略 mp-5（tokenize, analyst+viewer）

**批准后**：Govern 掩码卡片区出现新卡 mp-5（enabled）；Payment 对象详情的 Masking Policies 区块计数 +1，属性治理徽章从缺口变为已掩码。

**验收路径**：Perceive → perceive-5 → Governance Impact 显示 POLICY mp-4 [disabled] → Approve → Govern 页 Masking Policies 出现 "Tokenize Payment Method" → Ontology 打开 Payment 对象确认掩码徽章生效。

---

## UC-5 管道故障 → 对象健康（无需批准）

**角色**：Data Engineer · **触发**：Observe 事件「pipeline_failure」（sync_sales_order_to_dw）

**关联链**：事件 → 血缘节点详情（Adjacent Relations）→ `◆ Sales Order — view object` → 对象详情（健康 warning、质量规则、Open Proposals）。

**验收路径**：Ontology → Sales Order → View Lineage in Observe（直达节点详情）→ 节点详情 Ontology 芯片跳回对象；Observe Events 页点击事件 → 节点详情 → 对象。

---

## UC-6 覆盖缺口 → 本体扩展（引导流）

**角色**：Data Architect · **触发**：Topic 覆盖率 86%，`daily_gmv_aggregate` 未映射

**关联链**：Ontology Overview 漏斗「Not yet ontologized」→ Map in Model → Model 页该 Topic 卡片 `not in ontology yet`。

**验收路径**：Ontology Overview → 未本体化清单 → Map in Model → Model 页定位目标 Topic。（映射编辑器属 Phase 3，当前以引导流收口。）

---

## UC-7 术语评审与转正

**角色**：Data Steward · **触发**：Govern 术语 Risk Score 为 draft

**关联链**：术语 → `Risk Profile.risk_score`（对象芯片直达）→ 术语质量规则 gr-7。

**验收路径**：Govern → Business Glossary → Risk Score 行对象芯片 → Risk Profile 详情 → Glossary Terms 区块。术语的提案驱动变更见 UC-2（definition conflict → draft → 人工确认）。

---

## 关联矩阵总览

| 场景 | Ontology 对象/属性 | 规则 | 策略 | 术语 | 批准效果 |
|---|---|---|---|---|---|
| perceive-1 漂移 | Sales Order.paid_amount · Payment.paid_amount | gr-1, gr-8 | — | GMV, Paid Amount | gr-1 params 更新 |
| perceive-2 格式异常 | Sales Order.customer_id · Customer.user_id | gr-2, gr-3 | mp-2 | Customer ID ⚠冲突 | gr-2 params + 术语转 draft |
| perceive-3 新字段（已批准） | Sales Order.payment_method | — | — | Payment Method | （已落地：对象含该属性） |
| perceive-4 延迟恢复 | Sales Order（物化延迟） | — | — | — | 无（显式声明 no governance impact） |
| perceive-5 敏感未掩码 | Payment.payment_method | — | mp-4 → mp-5 | Payment Method | 新增策略 mp-5 |
| perceive-6 新字段 region | Customer.+region (proposed) | — | — | — | Customer 加属性 region |
