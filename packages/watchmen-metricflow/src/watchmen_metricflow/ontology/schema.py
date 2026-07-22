"""输入请求/响应模型。"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OntologyOrderBy(BaseModel):
	"""排序条件。"""
	field: str = Field(..., description='属性名或被请求的衍生属性名')
	direction: str = Field(default='asc', pattern='^(asc|desc)$', description='排序方向：asc / desc')


class OntologyQueryRequest(BaseModel):
	"""虚拟本体查询请求。

	对应文档 §4.1 的运行时查询接口。客户端只需指定虚拟对象 ID 与业务过滤条件，
	不需要感知底层物理表的 JOIN 逻辑。

	注意：filters 是否必填由系统配置 ONTOLOGY_QUERY_REQUIRE_FILTERS 控制（默认 True），
	校验在 service 层执行。
	"""
	virtualObjectId: str = Field(..., description='虚拟对象 ID（VirtualObject.id）')
	filters: Dict[str, Any] = Field(
		default_factory=dict,
		description='字段名 → 过滤值。值为标量时按等值过滤；也可传对象 '
		            '{"operator": "gt", "value": ...}，operator 取 FilterCondition 操作符集合'
		            '（eq/ne/in/not_in/gt/gte/lt/lte/between/is_null/is_not_null），'
		            '其中 between 的 value 为 2 个元素的列表 [下限, 上限]；'
		            'gt/gte/lt/lte/between 仅允许用于数值或日期时间类型字段')
	fields: List[str] = Field(default_factory=list, description='需返回的属性名；空=返回全部')
	includeDerived: List[str] = Field(default_factory=list, description='需计算的衍生属性名')
	orderBy: List[OntologyOrderBy] = Field(
		default_factory=list, description='排序条件；field 为属性名或 includeDerived 中的衍生属性名')
	limit: int = Field(default=100, ge=1, le=10000, description='最大返回行数')
	offset: int = Field(default=0, ge=0, description='分页偏移')


class OntologyQueryResponse(BaseModel):
	"""虚拟本体查询响应。"""
	virtualObject: str = Field(..., description='虚拟对象名称')
	rows: List[Dict[str, Any]] = Field(default_factory=list, description='业务数据行（已脱敏）')
	total: Optional[int] = Field(None, description='满足条件的总行数（可选）')
