from enum import Enum
from typing import Any, Dict, List, Optional

from watchmen_model.common import OptimisticLock, TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


# ============================================================================
# Enums, aligned with Open Data Product Specification (ODPS) v4.1
# ============================================================================

class DataProductStatus(str, Enum):
	'''ODPS lifecycle status of a data product.'''
	ANNOUNCEMENT = 'announcement'
	DRAFT = 'draft'
	DEVELOPMENT = 'development'
	TESTING = 'testing'
	ACCEPTANCE = 'acceptance'
	PRODUCTION = 'production'
	SUNSET = 'sunset'
	RETIRED = 'retired'


class DataProductVisibility(str, Enum):
	'''ODPS visibility of a data product.'''
	PRIVATE = 'private'
	INVITATION = 'invitation'
	ORGANISATION = 'organisation'
	DATASPACE = 'dataspace'
	PUBLIC = 'public'


class DataProductType(str, Enum):
	'''ODPS information product type.'''
	RAW_DATA = 'raw data'
	DERIVED_DATA = 'derived data'
	DATASET = 'dataset'
	REPORTS = 'reports'
	ANALYTIC_VIEW = 'analytic view'
	APPLICATION = 'application'
	OTHER = 'other'


class PortfolioPriority(str, Enum):
	CRITICAL = 'critical'
	HIGH = 'high'
	MEDIUM = 'medium'
	LOW = 'low'


class GovernanceProfile(str, Enum):
	STRUCTURED = 'structured'
	ENFORCED = 'enforced'
	AUTOMATED = 'automated'
	AUDIT_READY = 'audit_ready'


class PortType(str, Enum):
	'''Watchmen extension of ODPS dataAccess output port types.'''
	TOPIC = 'topic'
	SQL = 'sql'
	API = 'api'
	FILE = 'file'
	AI = 'ai'
	OTHER = 'other'


class KpiDirection(str, Enum):
	ASCENDING = 'ascending'
	DESCENDING = 'descending'


# ============================================================================
# Schema (ODPS dataAccess schema)
# ============================================================================

class SchemaColumn(ExtendedBaseModel):
	name: str = None
	column_type: str = None
	description: Optional[str] = None
	nullable: bool = True
	unique: bool = False
	primary_key: bool = False


class PortSchema(ExtendedBaseModel):
	columns: List[SchemaColumn] = []


# ============================================================================
# Ports (ODPS inputPort / outputPort / dataAccess)
# ============================================================================

class DataProductPort(ExtendedBaseModel):
	id: str = None
	name: str = None
	display_name: Optional[str] = None
	description: Optional[str] = None
	port_type: PortType = PortType.TOPIC
	format: Optional[str] = None
	authentication_method: Optional[str] = None
	specification: Optional[str] = None
	access_url: Optional[str] = None
	specs_url: Optional[str] = None
	documentation_url: Optional[str] = None
	# watchmen extension: bound topic (table)
	topic_id: Optional[str] = None
	topic_name: Optional[str] = None
	schema: Optional[PortSchema] = None
	tags: List[str] = []
	custom_properties: Dict[str, Any] = {}
	status: DataProductStatus = DataProductStatus.DRAFT


class SupportingElement(ExtendedBaseModel):
	name: str = None
	description: Optional[str] = None
	path: Optional[str] = None
	element_type: Optional[str] = None
	element_id: Optional[str] = None
	media_type: Optional[str] = None


# ============================================================================
# Strategy / KPI (ODPS productStrategy)
# ============================================================================

class Kpi(ExtendedBaseModel):
	id: str = None
	name: str = None
	description: Optional[str] = None
	unit: Optional[str] = None
	target: Optional[Any] = None
	direction: KpiDirection = KpiDirection.ASCENDING
	timeframe: Optional[str] = None
	frequency: Optional[str] = None
	calculation: Optional[str] = None


class ProductStrategy(ExtendedBaseModel):
	objectives: List[str] = []
	contributes_to_kpi: List[str] = []
	product_kpis: List[Kpi] = []
	related_kpis: List[Kpi] = []
	strategic_alignment: Optional[str] = None


# ============================================================================
# Contract / SLA / Data Quality / Pricing (ODPS)
# ============================================================================

class ProductContract(ExtendedBaseModel):
	id: str = None
	contract_type: Optional[str] = None
	contract_version: Optional[str] = None
	contract_url: Optional[str] = None
	spec: Optional[Dict[str, Any]] = None


class SlaDimension(ExtendedBaseModel):
	dimension: str = None
	objective: Optional[Any] = None
	unit: Optional[str] = None
	weight: Optional[float] = None
	description: Optional[str] = None


class Sla(ExtendedBaseModel):
	profile: Optional[str] = None
	description: Optional[str] = None
	support_hours: Optional[str] = None
	dimensions: List[SlaDimension] = []


class DataQualityDimension(SlaDimension):
	pass


class DataQuality(ExtendedBaseModel):
	profile: Optional[str] = None
	description: Optional[str] = None
	dimensions: List[DataQualityDimension] = []


class PricingPlan(ExtendedBaseModel):
	name: str = None
	price_currency: Optional[str] = None
	price: Optional[Any] = None
	unit: Optional[str] = None
	billing_duration: Optional[str] = None
	offering: Optional[str] = None
	description: Optional[str] = None


class DataProductCustomProperty(ExtendedBaseModel):
	name: str = None
	value: Any = None


# ============================================================================
# Catalog (custom directory tree for organizing data products)
# ============================================================================

class DataAssetCatalog(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	id: str = None
	name: str = None
	description: Optional[str] = None
	parent_id: Optional[str] = None
	order_index: int = 0


# ============================================================================
# Data Product (aggregate root, aligned with ODPS v4.1 product object)
# ============================================================================

class DataProduct(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	id: str = None
	# ODPS details
	name: str = None
	product_id: Optional[str] = None
	display_name: Optional[str] = None
	visibility: DataProductVisibility = DataProductVisibility.PRIVATE
	status: DataProductStatus = DataProductStatus.DRAFT
	product_type: DataProductType = DataProductType.DATASET
	value_proposition: Optional[str] = None
	description: Optional[str] = None
	categories: List[str] = []
	standards: List[str] = []
	tags: List[str] = []
	product_version: str = '1.0.0'
	portfolio_priority: Optional[PortfolioPriority] = None
	governance_profile: Optional[GovernanceProfile] = None
	version_notes: Optional[str] = None
	logo_url: Optional[str] = None
	output_formats: List[str] = []
	use_cases: List[str] = []
	recommended_data_products: List[str] = []
	created_date: Optional[str] = None
	updated_date: Optional[str] = None
	# ownership
	owner: Optional[str] = None
	owner_display_name: Optional[str] = None
	product_manager: Optional[str] = None
	maintainer: Optional[str] = None
	domain: Optional[str] = None
	# ODPS strategy / contract / sla / quality / pricing
	product_strategy: Optional[ProductStrategy] = None
	contract: Optional[ProductContract] = None
	sla: Optional[Sla] = None
	data_quality: Optional[DataQuality] = None
	pricing_plans: List[PricingPlan] = []
	license: Optional[str] = None
	data_holder: Optional[str] = None
	# ODPS ports
	input_ports: List[DataProductPort] = []
	output_ports: List[DataProductPort] = []
	supporting_elements: List[SupportingElement] = []
	custom_properties: Dict[str, Any] = {}
	# watchmen extension: asset organization
	catalog_id: Optional[str] = None
	topic_ids: List[str] = []
	value_score: int = 0


# ============================================================================
# Upsert payloads
# ============================================================================

class DataProductUpsert(ExtendedBaseModel):
	id: Optional[str] = None
	name: str = None
	display_name: Optional[str] = None
	product_id: Optional[str] = None
	visibility: Optional[DataProductVisibility] = None
	status: Optional[DataProductStatus] = None
	product_type: Optional[DataProductType] = None
	value_proposition: Optional[str] = None
	description: Optional[str] = None
	categories: Optional[List[str]] = None
	standards: Optional[List[str]] = None
	tags: Optional[List[str]] = None
	product_version: Optional[str] = None
	portfolio_priority: Optional[PortfolioPriority] = None
	governance_profile: Optional[GovernanceProfile] = None
	version_notes: Optional[str] = None
	logo_url: Optional[str] = None
	output_formats: Optional[List[str]] = None
	use_cases: Optional[List[str]] = None
	recommended_data_products: Optional[List[str]] = None
	owner: Optional[str] = None
	owner_display_name: Optional[str] = None
	product_manager: Optional[str] = None
	maintainer: Optional[str] = None
	domain: Optional[str] = None
	product_strategy: Optional[ProductStrategy] = None
	contract: Optional[ProductContract] = None
	sla: Optional[Sla] = None
	data_quality: Optional[DataQuality] = None
	pricing_plans: Optional[List[PricingPlan]] = None
	license: Optional[str] = None
	data_holder: Optional[str] = None
	input_ports: Optional[List[DataProductPort]] = None
	output_ports: Optional[List[DataProductPort]] = None
	supporting_elements: Optional[List[SupportingElement]] = None
	custom_properties: Optional[Dict[str, Any]] = None
	catalog_id: Optional[str] = None
	topic_ids: Optional[List[str]] = None
	value_score: Optional[int] = None


class DataAssetCatalogUpsert(ExtendedBaseModel):
	id: Optional[str] = None
	name: str = None
	description: Optional[str] = None
	parent_id: Optional[str] = None
	order_index: int = 0


class BatchCreateRequest(ExtendedBaseModel):
	'''Batch-add topics (tables) as data products into a catalog.'''
	topic_ids: List[str] = []
	catalog_id: Optional[str] = None
	status: Optional[DataProductStatus] = None
	domain: Optional[str] = None
	value_score: Optional[int] = None


class BatchDeleteRequest(ExtendedBaseModel):
	product_ids: List[str] = []


# ============================================================================
# Asset map payloads
# ============================================================================

class TopicSize(ExtendedBaseModel):
	topic_id: str = None
	topic_name: Optional[str] = None
	datasource_id: Optional[str] = None
	rows: int = 0
	factors: int = 0


class AssetSnapshot(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	id: str = None
	snapshot_date: str = None
	total_topics: int = 0
	total_rows: int = 0
	total_factors: int = 0
	product_count: int = 0
	topic_sizes: List[TopicSize] = []


__all__ = [
	'DataProductStatus', 'DataProductVisibility', 'DataProductType', 'PortfolioPriority',
	'GovernanceProfile', 'PortType', 'KpiDirection',
	'SchemaColumn', 'PortSchema', 'DataProductPort', 'SupportingElement',
	'Kpi', 'ProductStrategy', 'ProductContract', 'SlaDimension', 'Sla',
	'DataQualityDimension', 'DataQuality', 'PricingPlan', 'DataProductCustomProperty',
	'DataAssetCatalog', 'DataProduct',
	'DataProductUpsert', 'DataAssetCatalogUpsert', 'BatchCreateRequest', 'BatchDeleteRequest',
	'TopicSize', 'AssetSnapshot',
]
