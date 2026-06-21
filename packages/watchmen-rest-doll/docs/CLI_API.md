# Topic YAML CLI API 文档

> 面向 CLI / AI Agent 的 Topic YAML 接口说明
>
> 适用模块: `watchmen-rest-doll` admin/topic_router
>
> Base URL: `http://<host>/rest/doll/admin` (按部署调整前缀)

---

## 1. 设计目的

CLI 与 AI Agent 在对 Topic 进行 CRUD 时, 只需要 **业务字段** (name / dataSourceCode / factors 等),
不应接触任何内部主键 (topicId / factorId / tenantId / dataSourceId / version)。

为此, 系统提供一套 **无 id 结构** 的 YAML 端点 (agent-*), 与保留 id 的完整 YAML 端点
(*/yaml) 并存, CLI 优先使用前者。

| 场景 | 推荐端点 |
| --- | --- |
| 读取单个 topic (CLI 下载、Agent 读取上下文) | `GET /topic/yaml/agent-view` 或 `GET /topic/name/yaml/agent-view` |
| 批量拉取全部 topic (初始化、同步) | `GET /topic/all/yaml/agent-view` |
| 写入/更新 topic (CLI apply、Agent 工具调用) | `POST /topic/yaml/agent-upsert` (支持 `dry_run=true` 预演) |
| 需要拿到内部 id 的运维场景 | `GET /topic/yaml` / `POST /topic/yaml` (完整 schema) |

---

## 2. 通用约定

- **认证**: 所有端点都依赖 `PrincipalService`, 走现有登录态/Cookie。
  - `*admin*` 端点需要 `UserRole.ADMIN`
  - 部分读取端点 (`agent-view` 单条) 允许 `UserRole.CONSOLE`
- **Content-Type**:
  - 请求 YAML: `application/x-yaml` (或 `text/yaml`, body 直接放 YAML 文本)
  - 响应 YAML: `application/x-yaml`
- **租户隔离**: 所有操作自动限定为 `principal_service.get_tenant_id()`, 无需 (也不可) 传 `tenantId`。
- **环境限制**: `*agent-upsert*` 与 `POST /topic/yaml` 必须在 `design` 环境 (运行时会返回 400)。
- **错误码**:
  - `400` 参数缺失/YAML 反序列化失败
  - `403` 越权 (跨租户)
  - `404` 资源不存在 / 系统 topic 不可见
  - `500` 存储异常

---

## 3. 数据模型 (YAML Schema)

### 3.1 `AgentFactorYaml`

```yaml
name: string                  # 必填, 同一 topic 内唯一
type: <FactorType>            # 必填, 枚举: number / text / date / datetime / boolean / ...
label: string                 # 可选
enumId: string                # 可选, 引用枚举
description: string           # 可选
defaultValue: string          # 可选
flatten: bool                 # 可选, 默认 false
indexGroup: <FactorIndexGroup># 可选
encrypt: <FactorEncryptMethod># 可选
precision: string             # 可选
```

> 入参和出参共用本结构; 不含 `factorId` / `topicId` / `tenantId`。

### 3.2 `AgentTopicYaml`

```yaml
name: string                  # 必填, 业务主键 (upsert 匹配键)
type: <TopicType>             # 可选, 默认 distinct
kind: <TopicKind>             # 可选, 默认 business; system 一律拒绝写入
description: string           # 可选
dataSourceCode: string        # upsert 时必填; view 输出时尽量填回
factors:                      # 可选, 缺省 []
  - <AgentFactorYaml>
```

### 3.3 `AgentUpsertResult` (仅 /agent-upsert 响应)

```yaml
action: create | update | would_create | would_update
dryRun: bool
topic:                        # 与 GET agent-view 一致的 AgentTopicYaml, 包含系统生成的 topicId
  name: ...
  dataSourceCode: ...
  factors: [...]
factorIdMapping:              # factor.name -> factorId
  factor1: 1
  factor2: 2
```

---

## 4. 端点详细说明

### 4.1 按 topic_id 读取 (CLI 主要入口)

```
GET /topic/yaml/agent-view
```

| 参数 | 位置 | 必填 | 说明 |
| --- | --- | --- | --- |
| `topic_id` | query | 是 | TopicId |
| 权限 | - | - | ADMIN / CONSOLE |

响应: 单个 `AgentTopicYaml` 的 YAML 文本。

示例:

```bash
curl -b cookies.txt \
  'http://localhost:8000/rest/doll/admin/topic/yaml/agent-view?topic_id=1234567890'
```

```yaml
name: customer_profile
type: distinct
kind: business
description: Customer master data
dataSourceCode: mysql_main
factors:
  - name: customer_id
    type: text
    label: Customer ID
  - name: register_date
    type: date
```

---

### 4.2 按 name 读取 (CLI 友好)

```
GET /topic/name/yaml/agent-view
```

| 参数 | 位置 | 必填 | 说明 |
| --- | --- | --- | --- |
| `query_name` | query | 是 | 业务名 (租户内唯一) |
| 权限 | - | - | ADMIN / CONSOLE |

适用场景: CLI 通过业务名定位 (避免维护 id 映射)。

---

### 4.3 拉取全部 (初始化 / 同步)

```
GET /topic/all/yaml/agent-view
```

| 权限 | 说明 |
| --- | --- |
| ADMIN | 一次返回租户内全部业务 topic, 自动过滤系统 topic |

响应: YAML 数组 (每个元素即 `AgentTopicYaml`)。

---

### 4.4 Upsert (CLI apply / Agent 工具调用)

```
POST /topic/yaml/agent-upsert
```

| 参数 | 位置 | 必填 | 说明 |
| --- | --- | --- | --- |
| `dry_run` | query | 否 | `true` 时只校验不落库, `action` 前缀改为 `would_` |
| Body | - | 是 | `AgentTopicYaml` YAML 文本 |
| 权限 | - | - | ADMIN |

匹配规则:

- 按 `topic.name` + 租户 id 查重, 存在则 update, 不存在则 create。
- `factor.name` 已存在 → 复用旧 `factorId`; 新增 factor → 自动生成。
- 业务校验失败 (YAML 解析错误、`dataSourceCode` 缺失、`factor.name` 重复、`kind=system`) 一律返回 400。

#### 4.4.1 落库示例

请求:

```yaml
name: customer_profile
type: distinct
kind: business
description: Customer master data
dataSourceCode: mysql_main
factors:
  - name: customer_id
    type: text
    label: Customer ID
  - name: register_date
    type: date
```

命令:

```bash
curl -b cookies.txt -X POST \
  -H 'Content-Type: application/x-yaml' \
  --data-binary @customer_profile.yaml \
  'http://localhost:8000/rest/doll/admin/topic/yaml/agent-upsert'
```

响应:

```yaml
action: create
dryRun: false
topic:
  topicId: 1739284748392010000
  name: customer_profile
  type: distinct
  kind: business
  description: Customer master data
  dataSourceCode: mysql_main
  factors:
    - factorId: 1739284748392010001
      name: customer_id
      type: text
      label: Customer ID
    - factorId: 1739284748392010002
      name: register_date
      type: date
factorIdMapping:
  customer_id: 1739284748392010001
  register_date: 1739284748392010002
```

#### 4.4.2 Dry-run 预演

```bash
curl -b cookies.txt -X POST \
  -H 'Content-Type: application/x-yaml' \
  --data-binary @customer_profile.yaml \
  'http://localhost:8000/rest/doll/admin/topic/yaml/agent-upsert?dry_run=true'
```

响应 `action` 取值:

- `would_create` — topic 不存在, 将要新建
- `would_update` — topic 存在, 字段将被覆盖; `factorIdMapping` 仅包含命中的旧 factor

#### 4.4.3 Update 示例

```yaml
action: update
dryRun: false
topic:
  topicId: 1739284748392010000       # 已存在 id
  name: customer_profile             # 业务名 (匹配键)
  ...
factorIdMapping:
  customer_id: 1739284748392010001   # 复用旧 factorId
  register_date: 1739284748392010003 # 新增 factor, 生成新 id
```

> 注: `version` (乐观锁) 字段对 CLI 不可见, 服务端按 update 路径自动处理, 无需传入。

---

## 5. 完整 YAML 端点 (运维/兼容场景)

保留内部 id 的端点仍然可用, CLI 在以下情况可使用:

- 需要拿到 `topicId` 去做后续关联 (如 pipeline / connected space)
- 老的运维脚本 (不建议 Agent 调用)

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/topic/yaml` | GET | 按 topic_id 读取, 完整 schema (含 id) |
| `/topic/name/yaml` | GET | 按 name 读取, 完整 schema |
| `/topic/all/yaml` | GET | 全部 topic, 完整 schema 数组 |
| `/topic/yaml` | POST | 用完整 Topic YAML 落库 (ADMIN, design 环境) |

`POST /topic/yaml` 的 body 必须是 `Topic` 完整 schema:

```yaml
topicId: 1739284748392010000   # create 时可省略, 走 snowflake
tenantId: 1                    # 必须等于当前 principal 租户
name: customer_profile
type: distinct
kind: business
dataSourceId: 103              # 内部 id, 需自行映射
factors:
  - factorId: 1739284748392010001
    name: customer_id
    type: text
```

> 这套接口要求调用方维护 `topicId` / `factorId` / `dataSourceId`, 不推荐 CLI/Agent 使用。

---

## 6. CLI 调用建议流程

### 6.1 拉取 (context 加载)

```
GET /topic/yaml/agent-view?topic_id=<id>
  或
GET /topic/name/yaml/agent-view?query_name=<name>
  或 (批量)
GET /topic/all/yaml/agent-view
```

### 6.2 生成/修改 (Agent 决策 → apply)

1. 本地编辑/生成 `AgentTopicYaml` YAML
2. 先 `POST /topic/yaml/agent-upsert?dry_run=true` 校验
3. 确认 `would_create` / `would_update` 符合预期
4. 去掉 `dry_run` 参数真正落库
5. 解析返回的 `factorIdMapping` 用于后续 pipeline 配置

### 6.3 删除

CLI 暂不开放无 id 的删除端点; 如需删除, 走运维通道 `DELETE /topic?topic_id=<id>`
(需要 SUPER_ADMIN, 受 tuple delete 开关控制)。

---

## 7. 错误处理

| 现象 | 可能原因 | 建议处理 |
| --- | --- | --- |
| 400 `dataSourceCode is required.` | upsert body 缺 `dataSourceCode` | 补字段后重试 |
| 400 `Data source [xxx] not found in tenant [yyy].` | dataSourceCode 在租户内不存在 | 确认 dataSource 列表 |
| 400 `Duplicate factor names are not allowed.` | `factors[].name` 重复 | 合并/重命名 |
| 400 `System topics cannot be saved via agent-upsert.` | `kind: system` | 改用运维通道 |
| 400 `Current environment is runtime.` | 当前非 design 环境 | 联系管理员切换 |
| 404 | topic 不存在 / 跨租户 / 系统 topic | 走 `GET /topic/all/yaml/agent-view` 重新拉取 |

---

## 8. 参考实现

- 路由: `packages/watchmen-rest-doll/src/watchmen_rest_doll/admin/topic_router.py`
  - `class AgentFactorYaml` (line ~485)
  - `class AgentTopicYaml` (line ~501)
  - `class AgentUpsertResult` (line ~511)
  - `POST /topic/yaml/agent-upsert` (line ~597)
  - `GET /topic/yaml/agent-view` (line ~717)
  - `GET /topic/name/yaml/agent-view` (line ~745)
  - `GET /topic/all/yaml/agent-view` (line ~771)
