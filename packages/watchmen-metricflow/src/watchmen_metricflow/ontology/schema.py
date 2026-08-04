"""Request/response models for ontology query."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OntologyOrderBy(BaseModel):
	"""Order-by clause."""
	field: str = Field(..., description='Attribute name or requested derived attribute name')
	direction: str = Field(default='asc', pattern='^(asc|desc)$', description='Sort direction: asc / desc')


class OntologyGroupBy(BaseModel):
	"""Group-by dimension.

	Only text / datetime attributes are allowed (type validation is performed
	in the service layer; unresolvable types are leniently accepted).
	granularity is only valid for datetime fields; case-insensitive.
	"""
	field: str = Field(..., description='Virtual object attribute name (text / datetime type)')
	granularity: Optional[str] = Field(
		default=None, pattern='^(day|week|month|quarter|year)$',
		description='Datetime truncation: day / week / month / quarter / year; only valid for datetime fields')


class OntologyQueryRequest(BaseModel):
	"""Virtual ontology query request.

	The caller only needs to specify the virtual object ID and business filter
	conditions, without needing to know the underlying physical table JOIN logic.

	Note: whether filters are required is controlled by the system config
	ONTOLOGY_QUERY_REQUIRE_FILTERS (default True); validation is performed
	in the service layer.
	"""
	virtualObjectId: str = Field(..., description='Virtual object ID (VirtualObject.id)')
	filters: Dict[str, Any] = Field(
		default_factory=dict,
		description='Field name -> filter value. A scalar value applies equality filter; '
		            'an object {"operator": "gt", "value": ...} is also accepted, '
		            'where operator is from the FilterCondition operator set '
		            '(eq/ne/in/not_in/gt/gte/lt/lte/between/is_null/is_not_null). '
		            'For between, value is a 2-element list [low, high]; '
		            'gt/gte/lt/lte/between are only allowed on numeric or datetime fields')
	fields: List[str] = Field(default_factory=list, description='Attribute names to return; empty = return all')
	groupBy: List[OntologyGroupBy] = Field(
		default_factory=list,
		description='Group-by dimensions (text / datetime attributes). When specified, '
		            'results are grouped by these dimensions; fields not present in groupBy '
		            'are auto-merged into GROUP BY; when fields is empty, only group '
		            'dimensions and includeDerived aggregate columns are returned')
	includeDerived: List[str] = Field(default_factory=list, description='Derived attribute names to compute')
	orderBy: List[OntologyOrderBy] = Field(
		default_factory=list, description='Order-by conditions; field is an attribute name or a derived attribute name from includeDerived')
	limit: int = Field(default=100, ge=1, le=10000, description='Maximum number of rows to return')
	offset: int = Field(default=0, ge=0, description='Pagination offset')


class OntologyQueryResponse(BaseModel):
	"""Virtual ontology query response."""
	virtualObject: str = Field(..., description='Virtual object name')
	rows: List[Dict[str, Any]] = Field(default_factory=list, description='Data rows (masked)')
	total: Optional[int] = Field(None, description='Total number of matching rows (optional)')
