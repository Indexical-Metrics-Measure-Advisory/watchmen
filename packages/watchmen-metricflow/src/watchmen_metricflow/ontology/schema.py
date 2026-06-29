"""输入请求/响应模型。"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OntologyQueryRequest(BaseModel):
	"""虚拟本体查询请求。

	对应文档 §4.1 的运行时查询接口。客户端只需指定虚拟对象 ID 与业务过滤条件，
	不需要感知底层物理表的 JOIN 逻辑。
	"""
	virtualObjectId: str = Field(..., description='虚拟对象 ID（VirtualObject.id）')
	filters: Dict[str, Any] = Field(default_factory=dict, description='字段名 → 值 的等值过滤')
	fields: List[str] = Field(default_factory=list, description='需返回的属性名；空=返回全部')
	includeDerived: List[str] = Field(default_factory=list, description='需计算的衍生属性名')
	limit: int = Field(default=100, ge=1, le=10000, description='最大返回行数')
	offset: int = Field(default=0, ge=0, description='分页偏移')


class OntologyQueryResponse(BaseModel):
	"""虚拟本体查询响应。"""
	virtualObject: str = Field(..., description='虚拟对象名称')
	rows: List[Dict[str, Any]] = Field(default_factory=list, description='业务数据行（已脱敏）')
	total: Optional[int] = Field(None, description='满足条件的总行数（可选）')
