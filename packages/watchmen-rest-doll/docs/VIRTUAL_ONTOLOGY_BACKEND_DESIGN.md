# Virtual Ontology Backend Design

> 面向后端实施的虚拟本体论设计文档。
>
> 前端模型参考: `packages/watchmen-analysis-client/src/model/ontology.ts`
> 前端服务参考: `packages/watchmen-analysis-client/src/services/ontologyService.ts`

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  watchmen-analysis-client (React)                                │
│  model/ontology.ts          services/ontologyService.ts          │
│  类型定义 + UI config        工厂函数 / helper / CRUD stub       │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTP (YAML / JSON)
┌──────────────────────────────────▼──────────────────────────────┐
│  watchmen-rest-doll                                              │
│  admin/ontology_router.py                                        │
│  ├── GET  /ontology/yaml/agent-view         (CLI/AI Agent 读写)  │
│  ├── GET  /ontology/name/yaml/agent-view                        │
│  ├── GET  /ontology/all/yaml/agent-view                         │
│  ├── POST /ontology/yaml/agent-upsert                           │
│  ├── PUT  /ontology/yaml/agent-upsert                           │
│  ├── GET  /ontology/list                    (UI 列表)            │
│  ├── GET  /ontology/get                     (UI 详情)            │
│  ├── POST /ontology/save                    (UI 保存)            │
│  └── DELETE /ontology/delete                (UI 删除)            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│  watchmen-meta                                                   │
│  admin/ontology_service.py                                       │
│  ├── OntologyShaper (序列化/反序列化)                             │
│  └── OntologyService (CRUD 操作)                                │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│  watchmen-model                                                  │
│  admin/ontology.py                                               │
│  ├── VirtualOntology                                            │
│  ├── VirtualObject                                              │
│  ├── VirtualLink                                                │
│  ├── PhysicalTableMapping                                       │
│  ├── DerivedAttribute                                           │
│  └── OntologySensitivity (Enum)                                 │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│  watchmen-storage (MySQL / Oracle / MongoDB / MSSQL)             │
│  Table: virtual_ontologies                                       │
│  Columns: ontology_id, name, description, owner,                 │
│           technical_owner, tags, sensitivity,                    │
│           virtual_objects (JSON), virtual_links (JSON),          │
│           tenant_id, created_at, created_by,                     │
│           last_modified_at, last_modified_by, version            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据模型

### 2.1 文件: `packages/watchmen-model/src/watchmen_model/admin/ontology.py`

```python
from enum import Enum
from typing import List, Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, OptimisticLock, TopicId


class OntologySensitivity(str, Enum):
    PUBLIC = 'public'
    INTERNAL = 'internal'
    CONFIDENTIAL = 'confidential'
    RESTRICTED = 'restricted'


class PhysicalTableMapping(ExtendedBaseModel):
    """Physical table projected into a virtual object."""
    topicId: Optional[TopicId] = None
    topicName: Optional[str] = None
    alias: Optional[str] = None          # e.g. "cust" for dm_party_customer
    role: Optional[str] = 'primary'      # primary | secondary | lookup
    fields: Optional[List[str]] = []     # factor names exposed from this table


class VirtualObjectAttribute(ExtendedBaseModel):
    """Business attribute: field name -> source physical table.field."""
    name: Optional[str] = None
    sourceTable: Optional[str] = None    # alias of the physical table
    sourceField: Optional[str] = None


class DerivedAttribute(ExtendedBaseModel):
    """Derived attribute computed by traversing the virtual link graph."""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    objectId: Optional[str] = None       # parent virtual object id
    aggregate: Optional[str] = 'count'   # count | sum | avg | min | max | none
    path: Optional[List[str]] = []       # [objectId, linkId, objectId, ...]
    targetField: Optional[str] = None    # final field for aggregation


class VirtualObject(ExtendedBaseModel):
    """Virtual object: semantic projection of multiple physical tables."""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    physicalTables: Optional[List[PhysicalTableMapping]] = []
    attributes: Optional[List[VirtualObjectAttribute]] = []
    derivedAttributes: Optional[List[DerivedAttribute]] = []
    icon: Optional[str] = None
    color: Optional[str] = None


class JoinCondition(ExtendedBaseModel):
    """JOIN condition: source physical field -> target physical field."""
    sourceField: Optional[str] = None    # e.g. "cust.one_id"
    targetField: Optional[str] = None    # e.g. "pol.policy_holder_id"


class VirtualLink(ExtendedBaseModel):
    """Link between two virtual objects, resolved via physical table JOIN rules."""
    id: Optional[str] = None
    name: Optional[str] = None
    sourceObjectId: Optional[str] = None
    targetObjectId: Optional[str] = None
    joinType: Optional[str] = 'inner'    # inner | left | right | full
    joinConditions: Optional[List[JoinCondition]] = []
    description: Optional[str] = None


class VirtualOntology(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
    ontologyId: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    technicalOwner: Optional[str] = None
    tags: Optional[List[str]] = []
    sensitivity: Optional[OntologySensitivity] = OntologySensitivity.INTERNAL
    virtualObjects: Optional[List[VirtualObject]] = []
    virtualLinks: Optional[List[VirtualLink]] = []

    def __setattr__(self, name, value):
        if name == 'virtualObjects':
            super().__setattr__(name, VirtualOntology._construct_virtual_objects(value))
        elif name == 'virtualLinks':
            super().__setattr__(name, VirtualOntology._construct_virtual_links(value))
        else:
            super().__setattr__(name, value)

    @staticmethod
    def _construct_virtual_objects(values):
        if values is None:
            return []
        from watchmen_utilities import ArrayHelper
        return ArrayHelper(values).map(
            lambda x: x if isinstance(x, VirtualObject) else VirtualObject(**x)
        ).to_list()

    @staticmethod
    def _construct_virtual_links(values):
        if values is None:
            return []
        from watchmen_utilities import ArrayHelper
        return ArrayHelper(values).map(
            lambda x: x if isinstance(x, VirtualLink) else VirtualLink(**x)
        ).to_list()
```

### 2.2 元组 ID 注册

在 `packages/watchmen-model/src/watchmen_model/common/tuple_ids.py` 末尾追加:

```python
OntologyId = TypeVar('OntologyId', bound=str)
```

在 `packages/watchmen-model/src/watchmen_model/admin/__init__.py` 中导出:

```python
from .ontology import (
    VirtualOntology, VirtualObject, VirtualLink,
    PhysicalTableMapping, DerivedAttribute, OntologySensitivity,
    JoinCondition, VirtualObjectAttribute,
)
```

---

## 3. 存储层

### 3.1 数据库 DDL

**MySQL:**

```sql
CREATE TABLE virtual_ontologies (
    ontology_id       VARCHAR(50)  NOT NULL,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    owner             VARCHAR(100),
    technical_owner   VARCHAR(100),
    tags              JSON,
    sensitivity       VARCHAR(20)  NOT NULL DEFAULT 'internal',
    virtual_objects   JSON,
    virtual_links     JSON,
    tenant_id         VARCHAR(50)  NOT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        VARCHAR(50),
    last_modified_at  DATETIME,
    last_modified_by  VARCHAR(50),
    version           INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (ontology_id),
    UNIQUE INDEX u_virtual_ontologies_1 (name, tenant_id),
    INDEX (tenant_id)
);
```

**Oracle:**

```sql
CREATE TABLE virtual_ontologies (
    ontology_id       VARCHAR2(50)  NOT NULL,
    name              VARCHAR2(255) NOT NULL,
    description       CLOB,
    owner             VARCHAR2(100),
    technical_owner   VARCHAR2(100),
    tags              CLOB,
    sensitivity       VARCHAR2(20)  NOT NULL,
    virtual_objects   CLOB,
    virtual_links     CLOB,
    tenant_id         VARCHAR2(50)  NOT NULL,
    created_at        DATE          NOT NULL,
    created_by        VARCHAR2(50),
    last_modified_at  DATE,
    last_modified_by  VARCHAR2(50),
    version           NUMBER        NOT NULL,
    PRIMARY KEY (ontology_id)
);
CREATE UNIQUE INDEX u_virtual_ontologies_1 ON virtual_ontologies (name, tenant_id);
```

### 3.2 存储配置

在 `packages/watchmen-storage/src/watchmen_storage/storage_types.py` 中追加 entity name 常量:

```python
VIRTUAL_ONTOLOGY_ENTITY_NAME = 'virtual_ontologies'
```

在 `packages/watchmen-storage-mysql/meta-scripts/` 下新建版本目录和 DDL。

在 `packages/watchmen-storage-mongodb/src/watchmen_storage_mongodb/document_defs_mongo.py` 中追加 MongoDB document 定义。

---

## 4. 元数据服务层

### 4.1 文件: `packages/watchmen-meta/src/watchmen_meta/admin/ontology_service.py`

```python
from datetime import datetime
from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import VirtualOntology, OntologySensitivity
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import (
    ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint,
    EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow,
    EntityShaper, SnowflakeGenerator,
)
from watchmen_utilities import ArrayHelper, is_not_blank


ONTOLOGY_ENTITY_NAME = 'virtual_ontologies'


class OntologyShaper(EntityShaper):
    def serialize(self, ontology: VirtualOntology) -> EntityRow:
        return TupleShaper.serialize_tenant_based(ontology, {
            'ontology_id': ontology.ontologyId,
            'name': ontology.name,
            'description': ontology.description,
            'owner': ontology.owner,
            'technical_owner': ontology.technicalOwner,
            'tags': ontology.tags,
            'sensitivity': ontology.sensitivity.value if ontology.sensitivity else 'internal',
            'virtual_objects': [vo.dict() for vo in (ontology.virtualObjects or [])],
            'virtual_links': [vl.dict() for vl in (ontology.virtualLinks or [])],
        })

    def deserialize(self, row: EntityRow) -> VirtualOntology:
        return TupleShaper.deserialize_tenant_based(row, VirtualOntology(
            ontologyId=row.get('ontology_id'),
            name=row.get('name'),
            description=row.get('description'),
            owner=row.get('owner'),
            technicalOwner=row.get('technical_owner'),
            tags=row.get('tags'),
            sensitivity=row.get('sensitivity'),
            virtualObjects=row.get('virtual_objects'),
            virtualLinks=row.get('virtual_links'),
        ))


ONTOLOGY_ENTITY_SHAPER = OntologyShaper()


class OntologyService(TupleService):
    def get_entity_name(self) -> str:
        return ONTOLOGY_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return ONTOLOGY_ENTITY_SHAPER

    def should_record_operation(self) -> bool:
        return True

    def get_storable_id(self, storable: VirtualOntology) -> str:
        return storable.ontologyId

    def set_storable_id(self, storable: VirtualOntology, storable_id: str) -> VirtualOntology:
        storable.ontologyId = storable_id
        return storable

    # ---- query helpers ----

    def find_by_id(self, ontology_id: str) -> Optional[VirtualOntology]:
        return self.find_by_id(ontology_id)

    def find_by_name(self, name: str, tenant_id: str) -> Optional[VirtualOntology]:
        return self.find_one(EntityCriteriaJoint(
            conjunction=EntityCriteriaJointConjunction.AND,
            children=[
                EntityCriteriaExpression(
                    columnName='name', operator=EntityCriteriaOperator.EQUALS, value=name
                ),
                EntityCriteriaExpression(
                    columnName='tenant_id', operator=EntityCriteriaOperator.EQUALS, value=tenant_id
                ),
            ]
        ))

    def find_all(self, tenant_id: str) -> List[VirtualOntology]:
        return self.find(EntityCriteriaExpression(
            columnName='tenant_id', operator=EntityCriteriaOperator.EQUALS, value=tenant_id
        ))

    def find_page(self, tenant_id: str, pageable: Pageable) -> DataPage:
        return self.page_by_tenant(tenant_id, pageable)
```

### 4.2 注册服务工厂

在 `packages/watchmen-meta/src/watchmen_meta/admin/__init__.py` 中追加:

```python
from .ontology_service import OntologyService, ONTOLOGY_ENTITY_NAME, ONTOLOGY_ENTITY_SHAPER

def get_ontology_service(storage, snowflake_generator, principal_service) -> OntologyService:
    return OntologyService(storage, snowflake_generator, principal_service)
```

---

## 5. REST API 层

### 5.1 文件: `packages/watchmen-rest-doll/src/watchmen_rest_doll/admin/ontology_router.py`

#### 5.1.1 端点设计

| 方法 | 路径 | 认证 | 用途 |
|------|------|------|------|
| `GET` | `/ontology/yaml/agent-view` | ADMIN | CLI 拉取单个 ontology YAML（按 name 参数） |
| `GET` | `/ontology/name/yaml/agent-view` | ADMIN/CONSOLE | 同上，按 query param `name` |
| `GET` | `/ontology/all/yaml/agent-view` | ADMIN | CLI 拉取全部 ontology YAML |
| `POST` | `/ontology/yaml/agent-upsert` | ADMIN | CLI/AI Agent 写入/更新 ontology |
| `GET` | `/ontology/list` | ADMIN/CONSOLE | UI 分页列表 |
| `GET` | `/ontology/get` | ADMIN/CONSOLE | UI 获取单条详情 |
| `POST` | `/ontology/save` | ADMIN | UI 保存（JSON body） |
| `DELETE` | `/ontology/delete` | ADMIN | UI 删除 |

#### 5.1.2 YAML Schema（agent-view）

agent-view 的 YAML 不包含内部 ID，只包含业务字段：

```yaml
# 单个 ontology
name: Customer Virtual Ontology
description: One unified Customer object projected from 4 physical tables.
owner: CRM Team
technicalOwner: Data Platform Team
tags:
  - Master Data
  - PII Sensitive
sensitivity: confidential
virtualObjects:
  - name: Customer
    description: Unified customer view across person, contact, address tables.
    icon: "👤"
    color: bg-indigo-500
    physicalTables:
      - topicName: dm_party_customer
        role: primary
        alias: cust
        fields:
          - one_id
          - customer_name
      - topicName: dm_party_person
        role: secondary
        alias: person
        fields:
          - gender
          - birth_date
    attributes:
      - name: oneId
        sourceTable: cust
        sourceField: one_id
      - name: customerName
        sourceTable: cust
        sourceField: customer_name
    derivedAttributes:
      - name: totalActivePolicies
        description: Count of active policies linked to this customer.
        aggregate: count
        path:
          - vo-customer
          - vl-customer-policy
          - vo-policy
        targetField: policy_id
  - name: Policy
    description: Insurance policy object.
    icon: "📄"
    color: bg-emerald-500
    physicalTables:
      - topicName: dm_pa_policy_his
        role: primary
        alias: pol
        fields:
          - policy_id
          - policy_no
          - status
    attributes:
      - name: policyId
        sourceTable: pol
        sourceField: policy_id
    derivedAttributes: []
virtualLinks:
  - name: Customer ↔ Policy
    sourceObjectName: Customer
    targetObjectName: Policy
    joinType: left
    joinConditions:
      - sourceField: cust.one_id
        targetField: pol.policy_holder_id
    description: Link customers to their policies.
```

**批量拉取格式** (`/ontology/all/yaml/agent-view`):

```yaml
# 多个 ontology，用 "---" 分隔
name: Customer Virtual Ontology
...
---
name: Policy Virtual Ontology
...
```

#### 5.1.3 核心实现逻辑

```python
import yaml
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, Body, Query, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import get_ontology_service, OntologyService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import (
    UserRole, VirtualOntology, VirtualObject, VirtualLink,
    OntologySensitivity,
)
from watchmen_model.common import DataPage, Pageable
from watchmen_rest import get_any_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404, validate_tenant_id
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_ontology_service_instance(principal_service: PrincipalService) -> OntologyService:
    return OntologyService(
        ask_meta_storage(), ask_snowflake_generator(), principal_service
    )


# ============================================================================
# YAML helper structures (agent-view, no internal IDs)
# ============================================================================

class AgentYamlVirtualOntology:
    """Agent-view YAML model: no ontologyId, object IDs, or link IDs."""
    def __init__(self, **kwargs):
        self.name: str = kwargs.get('name', '')
        self.description: str = kwargs.get('description', '')
        self.owner: str = kwargs.get('owner', '')
        self.technicalOwner: str = kwargs.get('technicalOwner', '')
        self.tags: List[str] = kwargs.get('tags', [])
        self.sensitivity: str = kwargs.get('sensitivity', 'internal')
        self.virtualObjects: List[dict] = kwargs.get('virtualObjects', [])
        self.virtualLinks: List[dict] = kwargs.get('virtualLinks', [])


# ---- YAML -> VirtualOntology (agent-upsert) ----

def _agent_yaml_to_ontology(
    yaml_data: AgentYamlVirtualOntology,
    existing: Optional[VirtualOntology],
    service: OntologyService,
    principal_service: PrincipalService,
) -> VirtualOntology:
    """Convert agent-view YAML (no IDs) to full VirtualOntology model."""
    now = datetime.now().isoformat()
    tenant_id = principal_service.tenantId

    if existing:
        ontology = existing
        # build lookup maps from existing objects/links
        existing_obj_by_name = {vo.name: vo for vo in (ontology.virtualObjects or [])}
        existing_link_by_name = {vl.name: vl for vl in (ontology.virtualLinks or [])}
    else:
        ontology = VirtualOntology(
            ontologyId=str(service.snowflakeGenerator.next_id()),
            tenantId=tenant_id,
            createdAt=now,
            createdBy=principal_service.userId,
        )
        existing_obj_by_name = {}
        existing_link_by_name = {}

    ontology.name = yaml_data.name
    ontology.description = yaml_data.description
    ontology.owner = yaml_data.owner
    ontology.technicalOwner = yaml_data.technicalOwner
    ontology.tags = yaml_data.tags or []
    ontology.sensitivity = OntologySensitivity(yaml_data.sensitivity or 'internal')
    ontology.lastModifiedAt = now
    ontology.lastModifiedBy = principal_service.userId

    # ---- virtual objects ----
    objects: List[VirtualObject] = []
    for vo_data in (yaml_data.virtualObjects or []):
        vo_name = vo_data.get('name', '')
        existing_vo = existing_obj_by_name.get(vo_name)
        obj_id = existing_vo.id if existing_vo else f'vo-{service.snowflakeGenerator.next_id()}'
        objects.append(VirtualObject(
            id=obj_id,
            name=vo_name,
            description=vo_data.get('description', ''),
            icon=vo_data.get('icon'),
            color=vo_data.get('color'),
            physicalTables=vo_data.get('physicalTables', []),
            attributes=vo_data.get('attributes', []),
            derivedAttributes=_resolve_derived_attributes(
                vo_data.get('derivedAttributes', []), obj_id
            ),
        ))
    ontology.virtualObjects = objects

    # ---- virtual links (resolve object names -> IDs) ----
    obj_by_name = {vo.name: vo.id for vo in objects}
    links: List[VirtualLink] = []
    for vl_data in (yaml_data.virtualLinks or []):
        vl_name = vl_data.get('name', '')
        existing_vl = existing_link_by_name.get(vl_name)
        link_id = existing_vl.id if existing_vl else f'vl-{service.snowflakeGenerator.next_id()}'
        links.append(VirtualLink(
            id=link_id,
            name=vl_name,
            sourceObjectId=obj_by_name.get(vl_data.get('sourceObjectName', ''), ''),
            targetObjectId=obj_by_name.get(vl_data.get('targetObjectName', ''), ''),
            joinType=vl_data.get('joinType', 'inner'),
            joinConditions=vl_data.get('joinConditions', []),
            description=vl_data.get('description'),
        ))
    ontology.virtualLinks = links

    return ontology


# ---- VirtualOntology -> YAML (agent-view) ----

def _ontology_to_agent_yaml(ontology: VirtualOntology) -> dict:
    """Convert full VirtualOntology to agent-view YAML (strip IDs)."""
    obj_by_id = {vo.id: vo.name for vo in (ontology.virtualObjects or [])}

    return {
        'name': ontology.name,
        'description': ontology.description,
        'owner': ontology.owner,
        'technicalOwner': ontology.technicalOwner,
        'tags': ontology.tags,
        'sensitivity': ontology.sensitivity.value if ontology.sensitivity else 'internal',
        'virtualObjects': [
            {
                'name': vo.name,
                'description': vo.description,
                'icon': vo.icon,
                'color': vo.color,
                'physicalTables': [
                    {
                        'topicName': pt.topicName,
                        'role': pt.role,
                        'alias': pt.alias,
                        'fields': pt.fields,
                    }
                    for pt in (vo.physicalTables or [])
                ],
                'attributes': [
                    {'name': a.name, 'sourceTable': a.sourceTable, 'sourceField': a.sourceField}
                    for a in (vo.attributes or [])
                ],
                'derivedAttributes': [
                    {
                        'name': da.name,
                        'description': da.description,
                        'aggregate': da.aggregate,
                        'path': da.path,
                        'targetField': da.targetField,
                    }
                    for da in (vo.derivedAttributes or [])
                ],
            }
            for vo in (ontology.virtualObjects or [])
        ],
        'virtualLinks': [
            {
                'name': vl.name,
                'sourceObjectName': obj_by_id.get(vl.sourceObjectId, ''),
                'targetObjectName': obj_by_id.get(vl.targetObjectId, ''),
                'joinType': vl.joinType,
                'joinConditions': [
                    {'sourceField': jc.sourceField, 'targetField': jc.targetField}
                    for jc in (vl.joinConditions or [])
                ],
                'description': vl.description,
            }
            for vl in (ontology.virtualLinks or [])
        ],
    }
```

---

## 6. 端点详情

### 6.1 GET /ontology/all/yaml/agent-view

```python
@router.get('/ontology/all/yaml/agent-view', tags=['ADMIN'], response_class=Response)
async def list_all_ontologies_agent_view(
    principal_service: PrincipalService = Depends(get_any_admin_principal),
):
    service = get_ontology_service_instance(principal_service)
    ontologies = service.find_all(principal_service.tenantId)

    yaml_parts = []
    for ont in ontologies:
        yaml_parts.append(yaml.dump(
            _ontology_to_agent_yaml(ont),
            allow_unicode=True, default_flow_style=False, sort_keys=False,
        ))

    return Response(
        content='\n---\n'.join(yaml_parts),
        media_type='application/x-yaml',
    )
```

### 6.2 GET /ontology/name/yaml/agent-view

```python
@router.get('/ontology/name/yaml/agent-view', tags=['ADMIN', 'CONSOLE'], response_class=Response)
async def get_ontology_agent_view(
    name: str = Query(..., description='Ontology name'),
    principal_service: PrincipalService = Depends(get_console_principal),
):
    service = get_ontology_service_instance(principal_service)
    ontology = service.find_by_name(name, principal_service.tenantId)
    if not ontology:
        raise_404(f'Ontology [{name}] not found.')

    return Response(
        content=yaml.dump(
            _ontology_to_agent_yaml(ontology),
            allow_unicode=True, default_flow_style=False, sort_keys=False,
        ),
        media_type='application/x-yaml',
    )
```

### 6.3 POST /ontology/yaml/agent-upsert

```python
@router.post('/ontology/yaml/agent-upsert', tags=['ADMIN'], response_class=Response)
async def upsert_ontology_agent_view(
    request: Request,
    principal_service: PrincipalService = Depends(get_any_admin_principal),
):
    body = (await request.body()).decode('utf-8')
    yaml_data = yaml.safe_load(body)
    if not yaml_data:
        raise_400('YAML body is empty.')

    agent_data = AgentYamlVirtualOntology(**yaml_data)
    if is_blank(agent_data.name):
        raise_400('Ontology name is required.')

    service = get_ontology_service_instance(principal_service)

    def action():
        existing = service.find_by_name(agent_data.name, principal_service.tenantId)
        ontology = _agent_yaml_to_ontology(agent_data, existing, service, principal_service)
        service.create_or_update(ontology)

    trans(service, action)

    return Response(
        content=yaml.dump({'status': 'ok', 'name': agent_data.name}),
        media_type='application/x-yaml',
    )
```

### 6.4 UI 端点

```python
@router.get('/ontology/list', tags=['ADMIN', 'CONSOLE'])
async def list_ontologies(
    pageable: Pageable = Depends(),
    principal_service: PrincipalService = Depends(get_console_principal),
) -> DataPage:
    service = get_ontology_service_instance(principal_service)
    return service.find_page(principal_service.tenantId, pageable)


@router.get('/ontology/get', tags=['ADMIN', 'CONSOLE'])
async def get_ontology(
    ontology_id: str = Query(..., alias='ontologyId'),
    principal_service: PrincipalService = Depends(get_console_principal),
) -> VirtualOntology:
    service = get_ontology_service_instance(principal_service)
    ontology = service.find_by_id(ontology_id)
    if not ontology:
        raise_404(f'Ontology [{ontology_id}] not found.')
    validate_tenant_id(ontology, principal_service)
    return ontology


@router.post('/ontology/save', tags=['ADMIN'])
async def save_ontology(
    ontology: VirtualOntology,
    principal_service: PrincipalService = Depends(get_any_admin_principal),
) -> VirtualOntology:
    if is_blank(ontology.name):
        raise_400('Ontology name is required.')

    service = get_ontology_service_instance(principal_service)

    def action():
        existing = service.find_by_name(ontology.name, principal_service.tenantId)
        if existing and existing.ontologyId != ontology.ontologyId:
            raise_400(f'Ontology [{ontology.name}] already exists.')
        service.create_or_update(ontology)

    trans(service, action)
    return ontology


@router.delete('/ontology/delete', tags=['ADMIN'], response_class=Response)
async def delete_ontology(
    ontology_id: str = Query(..., alias='ontologyId'),
    principal_service: PrincipalService = Depends(get_any_admin_principal),
):
    service = get_ontology_service_instance(principal_service)
    ontology = service.find_by_id(ontology_id)
    if not ontology:
        raise_404(f'Ontology [{ontology_id}] not found.')

    def action():
        service.delete_by_id(ontology_id)

    trans(service, action)
    return Response(content='', status_code=204)
```

---

## 7. 注册路由

### 7.1 在 `packages/watchmen-rest-doll/src/watchmen_rest_doll/main.py` 中挂载

```python
from watchmen_rest_doll.admin.ontology_router import router as ontology_router

# 在 app.include_router 区域追加:
app.include_router(ontology_router)
```

### 7.2 在 `packages/watchmen-rest-doll/src/watchmen_rest_doll/admin/__init__.py` 中导出

```python
from .ontology_router import router as ontology_router
```

---

## 8. 前端接入适配

### 8.1 替换 `ontologyService` 的 localStorage 实现

在 `packages/watchmen-analysis-client/src/services/ontologyService.ts` 中，将 `ontologyService` 改为调用后端 API:

```typescript
const BASE = '/rest/doll/admin';

export const ontologyService = {
  async list(): Promise<VirtualOntology[]> {
    const page = await client.getJson<DataPage<VirtualOntology>>(
      `${BASE}/ontology/list?pageNumber=1&pageSize=100`
    );
    return page.data;
  },

  async save(ontology: VirtualOntology): Promise<VirtualOntology> {
    return client.postJson(`${BASE}/ontology/save`, ontology);
  },

  async remove(id: string): Promise<void> {
    await client.delete(`${BASE}/ontology/delete?ontologyId=${id}`);
  },
};
```

### 8.2 CLI / AI Agent 接入

agent-cli 的 pull/push 命令改为调用 agent-view 端点:

```bash
# 拉取全部 ontology
curl -X GET http://host/rest/doll/admin/ontology/all/yaml/agent-view

# 拉取单个 ontology
curl -X GET "http://host/rest/doll/admin/ontology/name/yaml/agent-view?name=Customer%20Virtual%20Ontology"

# 推送/更新 ontology
curl -X POST http://host/rest/doll/admin/ontology/yaml/agent-upsert \
  -H "Content-Type: application/x-yaml" \
  --data-binary @ontology.yaml
```

---

## 9. 实施步骤

| 步骤 | 模块 | 内容 | 预估 |
|------|------|------|------|
| 1 | watchmen-model | 新建 `admin/ontology.py`，追加 `tuple_ids.py` 的 `OntologyId` | 小 |
| 2 | watchmen-storage | 追加 entity name 常量，各存储引擎 DDL (MySQL/Oracle/MongoDB) | 中 |
| 3 | watchmen-meta | 新建 `admin/ontology_service.py`，实现 `OntologyShaper` + `OntologyService` | 中 |
| 4 | watchmen-rest-doll | 新建 `admin/ontology_router.py`，实现全部 8 个端点 | 中 |
| 5 | watchmen-rest-doll | `main.py` 挂载路由 | 小 |
| 6 | watchmen-analysis-client | 替换 `ontologyService` 的 localStorage 为 HTTP 调用 | 小 |
| 7 | watchmen-agent-cli | 新增 `ontology pull/push` 子命令 | 小 |
| 8 | 集成测试 | 端到端测试: YAML push → DB 存储 → YAML pull → 前端展示 | 小 |

---

## 10. 注意事项

1. **JSON 字段**: `virtual_objects` 和 `virtual_links` 存储为 JSON 列。MySQL 5.7+ 支持 JSON 类型，Oracle 使用 CLOB 存 JSON 文本，MongoDB 直接存子文档。

2. **ID 生成**: 所有 entity ID 通过 `SnowflakeGenerator.next_id()` 生成，保持与现有系统一致。

3. **多租户**: 所有查询都带 `tenant_id` 过滤，遵循现有 `TenantBasedTuple` 模式。

4. **乐观锁**: 继承 `OptimisticLock`，update 时检查 `version` 防止并发冲突。

5. **操作审计**: `should_record_operation()` 返回 `True`，会自动记录 CRUD 操作日志。

6. **YAML 兼容**: agent-view 的 `sourceObjectName`/`targetObjectName` 在 upsert 时通过 name 反查 ID，保持与前端 virtualObjects 的 ID 一致。