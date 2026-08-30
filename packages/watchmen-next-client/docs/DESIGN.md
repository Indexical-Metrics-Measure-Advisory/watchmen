# DataMo Trusted Data Platform — 设计文档

> **Watchmen Next Client** · Ontology-Driven Data Platform
>
> 目标：**一切都是更好的构建 Ontology** —— 让企业数据从"管道灰盒"变成一个透明、可信、持续生长的业务本体。
>
> 完整用户 case 集与验收路径见 [USER-CASES.md](./USER-CASES.md)。

---

## 一、平台定位

DataMo 是一个 **以 Ontology（本体）为驱动核心的数据平台**。Ontology 不是又一个功能模块，而是整个平台的 **内核**：业务对象（Object）、关系（Link）与属性（Attribute）构成对企业的统一建模，其余一切能力都是为「构建更好的本体」服务的环节。

| 传统数据平台 | DataMo Ontology Platform |
|---|---|
| 按技术栈组织：采集/建模/管道/治理各自为政 | **按本体组织**：每个模块都是本体构建闭环的一环 |
| 数据进来→出去，中间黑盒 | **全链路可观测**，对象如何被物化、指标如何溯源一目了然 |
| schema 靠人工约定 | **Agent 主动感知 drift**，把变更作为本体修改提案提交人工审批 |
| AI 只能写 SQL | **AI 理解对象语义**，知道"GMV 影响哪些对象与报表" |
| 敏感数据靠文档约定 | **Trust 层内置脱敏**，敏感属性在对象层就被标记、掩码、不可旁路 |
| 数据价值不可量化 | **覆盖率度量**：多少 Topic 已被本体化，缺口清晰可见 |

**一句话：本体是内核，Agent 是提案者，人是决策者——数据像代码一样被 review、test、deploy。**

---

## 二、本体构建闭环（新的信息架构）

侧边栏按本体构建的叙事分组，默认落地页是 Ontology 本身：

```
◆  ONTOLOGY   本体（内核，默认首页）
     对象/关系/属性工作台 —— 一切的最终产物与出发点

◎  AGENT      智能体（提出修改）
     Perceive   AI 感知 drift → 生成本体变更提案
     Feedback   人工决策闭环，训练 Agent

⬡  BUILD      构建（物化本体）
     Ingest     采集 —— 为本体提供原材料
     Model      建模 —— Topic/Factor → 对象/属性
     Transform  加工 —— 物化与维护对象的管道

◌  RUNTIME    运行时（校验本体）
     Observe    全链路血缘/健康/事件，本体物化质量的运行时真相

⛨  TRUST      信任（守护本体）
     Govern     质量规则 + 脱敏策略 + 业务术语表

⚙  SYSTEM
     Settings
```

闭环：**感知提出修改 → 构建物化 → 本体成形 → 运行时校验 → 信任守护 → 再次感知**。

---

## 三、系统架构

### 3.1 模块全景

```
                        Watchmen Next Client
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Ontology Workspace    Agent Layer          Business State
   (objects / links /         │                     │
    attributes / glossary)┌───┴─────┐          ┌────┴────┐
        ▲                 │ Chat    │◄────────►│ Store   │
        │                 │ Panel   │  actions │(in-mem) │
        │                 └─────────┘          └────┬────┘
   Build/Runtime/Trust                            │
   模块全部通过交叉链接指向本体             ┌──────┴───────┐
                                    │ Ontology Data │
                                    │ objects/links/│
                                    │ glossary(+全部│
                                    │ 运行时夹具)    │
                                    └───────────────┘
```

### 3.2 Ontology 数据模型

与后端 `watchmen-model/admin/ontology.py` 的 `VirtualOntology` 形状对齐（UI 精简版）：

| 前端模型（`src/models/ontology.ts`） | 后端对应 | 说明 |
|---|---|---|
| `OntologyObject` | `VirtualObject` | 业务对象；`primaryTopicId` = `PhysicalTableMapping(kind='primary')` |
| `OntologyAttribute` | `VirtualObjectAttribute` | 属性映射：`sourceTopic`（topicName）+ `sourceFactor`（Factor.name） |
| `OntologyDerivedAttribute` | `DerivedAttribute` | 沿 `path[]`（link/object 跳序）做聚合（sum/count/…） |
| `OntologyLink` | `VirtualLink` | 对象间关系 + 基数 + join 条件摘要 |
| `GlossaryTerm` | `business_glossary.Term` | 术语锚定到对象与属性（`relatedAttributes`） |
| `OntologySensitivity` | `OntologySensitivity` | public / internal / confidential / restricted |

本体层的健康与治理是**从运行时数据推导出来的投影**：对象健康 = 其物化 Topic 健康的最差值；属性治理徽章 = 质量规则（`GovernRule.targetTopic/targetFactor`）、脱敏策略（`MaskingPolicy.targetTopic/targetFactor`）与术语锚定的汇聚。

### 3.3 与 7 层血缘的关系

血缘图（Observe）回答"对象如何被物化"，本体图（Ontology）回答"业务由什么对象构成"，二者互为映射：

```
业务视图   Customer ──places──▶ Sales Order ──settles──▶ Payment
              │                    │  │
              │ generates          │  └ assessed_by ──▶ Risk Profile
              ▼                    ▼
物化视图   user_profile        sales_order_raw ─pipeline─▶ sales_order_curated
(Observe 7 层: ingest→raw→pipeline→topic→semantic→metric→consumption)
```

### 3.4 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 构建 | Vite + TypeScript | 零配置 HMR，ESM 原生 |
| 状态 | 自研 Store（可变单例） | 轻量，无框架依赖，可嵌入任意页面 |
| UI | 原生 CSS（CSS 变量体系） | 零运行时开销，主题化支持 |
| 渲染 | 模板字面量 + innerHTML | 极简架构，无 Virtual DOM overhead |
| Agent | Chat Panel + 事件分发 | 人机协同的对话式交互 |
| 后端对接 | REST / WebSocket（待集成） | 当前为 Mock Data 阶段，类型已对齐后端 |

---

## 四、模块设计

### 4.1 Ontology — 本体工作台（内核）

```
Ontology Page
├── Overview
│   ├── KPI（Objects / Relations / Attributes / Topic Coverage %）
│   ├── Construction Progress（Sources → Topics → Objects 构建漏斗）
│   │   └── 未本体化 Topic 清单（"Map in Model" 一键跳转）
│   ├── Business Domains（域卡片，点击进入目录并按域过滤）
│   ├── Agent Proposals（待审批本体变更提案入口）
│   └── Business Glossary（术语预览，管理入口在 Govern）
│
├── Graph（对象星座图）
│   ├── Object Constellation（对象卡片，含属性/关系/治理分）
│   ├── Relations（typed link 行：source → 关系名/基数/join → target）
│   └── Materialization（对象 ◀── 物化 Topic 芯片 + 未映射清单）
│
├── Objects（目录：搜索 + 域/敏感级过滤）
│
└── Object Detail（对象详情）
    ├── Attributes（属性表：类型 / Topic→Factor 映射 / 治理徽章 / 术语）
    ├── Derived Attributes（关系路径聚合，如 lifetime_value）
    ├── Relations / Materialization / Glossary Terms
    ├── Quality Rules & Masking Policies（对象级治理汇聚）
    ├── Data Preview（模拟本体查询 API 输出，实际应用遮掩/Hash 脱敏策略）
    └── Actions（"View Lineage in Observe" 深链 / "Open Govern"）
```

**覆盖率是第一公民**：`coverage = 被对象映射的 Topic 数 / 全部 Topic 数`，未映射的 Topic 在漏斗、Graph、Model 页三处显式可见——本体构建的缺口永远不藏起来。

### 4.2 Perceive — AI 本体变更提案（影响链中枢）

AI 感知 drift（分布漂移/格式异常/字段发现/敏感暴露/延迟），**每个感知事件都是一条结构化提案**，必须回答三个问题：

1. **Ontology Impact** — 影响哪些对象/属性（含 `proposed` 新属性），每个属性展示当前治理状态
2. **Governance Impact** — 触及哪些质量规则（含实时 params）、脱敏策略、术语（定义冲突红色高亮）
3. **Applied Effects** — 批准后哪些治理资产发生什么变化

- 无治理影响的事件必须显式声明 "No governance impact"，不允许留空
- Approve 触发闭环引擎：effect（更新规则参数/新增对象属性/新增脱敏策略/更新术语）直接应用到内存状态，Govern 与 Ontology 页立即可见，规则行带 `⟳ updated by perceive-N` 溯源徽章
- 全部事件行（Timeline / Agent Log / Ontology Overview）带对象回链芯片；对象详情带 Open Proposals 区块反向列出触及它的提案
- 置信度 ≥90% 建议自动执行

### 4.3 Feedback — 人机协同决策闭环

检测 → 提案 → 人工审批 → 执行/保持 → Agent Log 记录 → 下次参考历史决策。决策的对象始终是本体的某个部分（阈值、字段、管道），因此每条决策都在让本体变得更好。

### 4.4 Ingest — 本体的原材料

数据源连接与同步健康。"Bring raw material in — the starting point of every Ontology object"。

### 4.5 Model — 对象的原料车间

Topic/Factor 定义与业务域归类。每个 Topic 卡片带本体回链芯片：

- 已映射：`◆ Sales Order`（点击直达对象详情）
- 未映射：`not in ontology yet`（构建缺口的显式提示）

### 4.6 Transform — 本体的物化管道

管道目录；每条管道显示其目标 Topic 被哪个对象消费（`◆` 芯片回链本体）。

### 4.7 Observe — 本体的运行时真相

全链路血缘（Overview / Catalog / Graph / Impact / Events）。面向本体的增强：

- Hero 叙事改为 "Runtime truth for the Ontology"
- 节点详情面板：topic/factor 类节点出现 `◆ <Object> — view object` 回链芯片，血缘与本体双向跳转
- 本体详情页 "View Lineage in Observe" 深链直达对应节点详情

### 4.8 Govern — 本体的信任层

质量规则 / 脱敏策略 / **业务术语表**（新增板块）三合一：

- 规则与策略行显示所属对象芯片（规则 → 对象的直接映射）
- 术语表每条术语锚定对象与属性，状态（active/draft/deprecated）+ 域分类
- 对象详情页的治理评分（⛨）即由这三类覆盖度推导

### 4.9 Agent Panel — 对话式入口

Chat 建议动作新增 `Explore Ontology`（打开本体图谱）；全局 Agent Activity Log 不变。

---

## 五、数据流架构

```
                             ┌──── Perceive: 本体变更提案 ────┐
                             │        (人工 Approve)          │
  ┌──────────┐    ┌──────────▼────┐    ┌──────────┐    ┌──────────┐
  │  Source  │───▶│  Ingest       │───▶│  Raw     │───▶│ Pipeline │
  │  Systems │    │  (采集层)     │    │  Topic   │    │ (管道层)  │
  └──────────┘    └───────────────┘    └──────────┘    └─────┬────┘
                                                             │
  ┌──────────┐    ┌──────────┐    ┌──────────────────────────▼─┐
  │Consumers │◀───│ Metric   │◀───│ Ontology Objects             │
  │(报表/告警)│    │ (指标层) │    │  Customer / Order / Payment  │
  └──────────┘    └──────────┘    │  (+ links / derived attrs)   │
       ▲                          └──────────────────────────────┘
       │                                         ▲
       └──────── Observe 全链路校验 ─────────────┘
                  Govern 信任守护（质量/脱敏/术语）
```

---

## 六、实现路线图

### Phase 1：本体驱动原型 ✅（当前阶段）

- [x] Ontology 工作台（Overview / Graph / Objects / Object Detail）
- [x] 本体模型与后端 VirtualOntology 形状对齐（对象/属性/派生属性/关系/术语）
- [x] 侧边栏按本体构建闭环分组，Ontology 为默认首页
- [x] 全站交叉链接：Model/Transform/Govern/Perceive → 对象详情，Observe ↔ 对象双向跳转
- [x] 覆盖率度量与未本体化 Topic 的显式提示
- [x] Govern 术语表板块 + 对象级治理评分
- [x] **提案影响链中枢**：感知事件三向关联（Ontology / Governance / Effects），批准闭环引擎 + 溯源徽章 + 对象详情 Open Proposals
- [x] 用户 case 集（docs/USER-CASES.md）与按 case 验收
- [x] Observe 全链路（Overview / Catalog / Graph / Impact / Events）
- [x] Perceive 感知引擎（Timeline + Change Detail + Approve/Reject）
- [x] Agent Chat Panel + Activity Log
- [x] 脱敏规则生效：Data Preview 实际应用遮掩/Hash 策略（partial_mask/sha256/redact/tokenize，镜像后端查询 API 行为）

### Phase 2：后端集成（待实现）

Mock 类型已与后端对齐，接入时只需替换服务层：

- [ ] `GET /ontology/list` / `GET /ontology/get?ontologyId=` → 对象/关系列表
- [ ] `POST /ontology/{ontologyId}/query` → Data Preview 真实化（请求体 `virtualObjectId/filters/fields/groupBy/limit`）
- [ ] `GET /ontology/governance/map` → 属性治理徽章真实化（encrypt/sensitiveType/PII 术语/监控规则）
- [ ] `/metricflow/business-glossary/*` → 术语表真实化
- [ ] 认证 & 鉴权、多租户、WebSocket 实时事件

### Phase 3：深度功能（待实现）

- [ ] 本体编辑器（对象/关系/派生属性的可视化编辑，对齐 `/ontology/save`）
- [ ] Agent 提案 → 本体 diff 预览（提案即 `VirtualObject` 变更集）
- [ ] YAML agent-view 集成（`/ontology/all/yaml/agent-view`，Agent 可读写本体）
- [ ] Perceive：AI 模型接入真实 drift 检测
- [ ] Observe：Pipeline DAG 可视化编辑

### Phase 4：企业级能力（待实现）

- [ ] 本体版本化与审批流（Decision Store / Audit Trail）
- [ ] 报表导出（PDF / Excel）、Webhook 告警集成
- [ ] RBAC 细粒度权限（对象/属性级，复用 sensitivity 分级）
- [ ] 多集群部署

---

## 七、设计原则

1. **Ontology-Centric（本体即内核）**
   - 一切模块都是本体构建闭环的一环：感知提案 → 构建物化 → 运行时校验 → 信任守护
   - 覆盖率、缺口、治理评分永远显式可见

2. **Progressive Disclosure（渐进式展示）**
   - 全局概览 → 搜索定位 → 深层探索 → 细节分析
   - 5 对象 → 50 Topic → 100+ 指标 → 始终可导航

3. **Health-First（健康优先）**
   - 所有资产都有健康状态（Healthy / Warning / Error），对象健康由物化层推导
   - 颜色编码：绿/橙/红

4. **Agent-Centric（Agent 驱动）**
   - AI 不只是工具，是本体的共同构建者：检测 → 分析 → 提案 → 人工决策 → 学习

5. **Zero-Framework（零框架依赖）**
   - 原生 TypeScript + Vite + CSS Variables
   - 可嵌入任何页面（通过 `window.mountWatchmenUI(container)`）

6. **Source-of-Truth（唯一真相来源）**
   - 业务对象在本体层统一定义，物理层（Topic/Factor/Pipeline）只负责物化
   - 从采集到消费，一条血缘链；血缘与本体双向可导航
