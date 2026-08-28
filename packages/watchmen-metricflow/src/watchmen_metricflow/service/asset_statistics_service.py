from datetime import datetime
from typing import Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.service.service_helper import ask_topic_data_service
from watchmen_data_kernel.service.storage_helper import ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, TopicKind
from watchmen_utilities import ExtendedBaseModel, is_blank, is_not_blank

from watchmen_metricflow.meta.data_product_meta_service import (
	DataAssetCatalogService, DataProductService, AssetSnapshotService,
)
from watchmen_metricflow.model.data_product import TopicSize, AssetSnapshot
from watchmen_metricflow.service.asset_value_service import (
	AutoScoreBreakdown, COMPOSITE_AUTO_WEIGHT, compute_auto_scores,
)
from watchmen_metricflow.util import trans_readonly


# ============================================================================
# Response models
# ============================================================================


class ProductRank(ExtendedBaseModel):
	product_id: str = None
	name: str = None
	display_name: Optional[str] = None
	catalog_id: Optional[str] = None
	# manual score, human-assigned on the product (value_score field)
	value_score: int = 0
	manual_score: int = 0
	auto_score: int = 0
	# composite = COMPOSITE_AUTO_WEIGHT * auto + (1 - COMPOSITE_AUTO_WEIGHT) * manual
	composite_score: int = 0
	metric_refs: int = 0
	pipeline_refs: int = 0
	topic_count: int = 0
	rows: int = 0


class CatalogRank(ExtendedBaseModel):
	catalog_id: Optional[str] = None
	name: str = None
	product_count: int = 0


class DomainRank(ExtendedBaseModel):
	domain: str = None
	product_count: int = 0
	rows: int = 0


class AssetMapResponse(ExtendedBaseModel):
	# resource statistics
	total_topics: int = 0
	total_rows: int = 0
	total_factors: int = 0
	total_products: int = 0
	total_datasources: int = 0
	total_catalogs: int = 0
	# rankings
	value_ranking: List[ProductRank] = []
	storage_ranking: List[TopicSize] = []
	inventory_ranking: List[CatalogRank] = []
	domain_ranking: List[DomainRank] = []
	# storage trend (from snapshots)
	storage_trend: List[AssetSnapshot] = []
	# current topic sizes
	topic_sizes: List[TopicSize] = []
	generated_at: str = None


# ============================================================================
# Service
# ============================================================================

def get_principal_services(principal_service: PrincipalService):
	storage = ask_meta_storage()
	snowflake_generator = ask_snowflake_generator()
	catalog_service = DataAssetCatalogService(storage, snowflake_generator, principal_service)
	product_service = DataProductService(storage, snowflake_generator, principal_service)
	snapshot_service = AssetSnapshotService(storage, snowflake_generator, principal_service)
	topic_service = TopicService(storage, snowflake_generator, principal_service)
	return catalog_service, product_service, snapshot_service, topic_service


def count_topic_rows(topic: Topic, principal_service: PrincipalService) -> int:
	'''Count rows of a topic in its physical storage. Returns 0 when unavailable.'''
	try:
		if topic.kind == TopicKind.SYNONYM or is_blank(topic.dataSourceId):
			return 0
		storage = ask_topic_storage(topic, principal_service)
		service = ask_topic_data_service(TopicSchema(topic), storage, principal_service)
		return service.count()
	except Exception:
		# data source unreachable or storage type unsupported, skip this topic
		return 0


def collect_topic_sizes(topics: List[Topic], principal_service: PrincipalService) -> List[TopicSize]:
	sizes: List[TopicSize] = []
	for topic in topics:
		rows = count_topic_rows(topic, principal_service)
		sizes.append(TopicSize(
			topic_id=topic.topicId,
			topic_name=topic.name,
			datasource_id=topic.dataSourceId,
			rows=rows,
			factors=len(topic.factors or []),
		))
	return sizes


def build_asset_map(principal_service: PrincipalService) -> AssetMapResponse:
	catalog_service, product_service, snapshot_service, topic_service = \
		get_principal_services(principal_service)

	def action() -> AssetMapResponse:
		tenant_id = principal_service.get_tenant_id()
		topics = topic_service.find_all(tenant_id) if is_not_blank(tenant_id) else topic_service.find_all(None)

		catalogs = catalog_service.find_all()
		products = product_service.list_products()

		topic_sizes = collect_topic_sizes(topics, principal_service)
		rows_by_topic: Dict[str, int] = {s.topic_id: s.rows for s in topic_sizes}
		topic_name_by_id: Dict[str, str] = {t.topicId: t.name for t in topics}

		total_rows = sum(s.rows for s in topic_sizes)
		total_factors = sum(s.factors for s in topic_sizes)
		total_datasources = len({t.dataSourceId for t in topics if is_not_blank(t.dataSourceId)})

		# value ranking: composite score (auto + manual blend) desc, rows as tie-breaker
		auto_scores = compute_auto_scores(
			catalog_service.storage, products, topic_sizes, principal_service, tenant_id)
		value_ranking: List[ProductRank] = []
		for p in products:
			topic_ids = p.topic_ids or []
			breakdown: AutoScoreBreakdown = auto_scores.get(p.id) or AutoScoreBreakdown(product_id=p.id)
			manual_score = p.value_score or 0
			composite_score = round(
				COMPOSITE_AUTO_WEIGHT * breakdown.auto_score
				+ (1 - COMPOSITE_AUTO_WEIGHT) * manual_score)
			value_ranking.append(ProductRank(
				product_id=p.id,
				name=p.name,
				display_name=p.display_name,
				catalog_id=p.catalog_id,
				value_score=manual_score,
				manual_score=manual_score,
				auto_score=breakdown.auto_score,
				composite_score=composite_score,
				metric_refs=breakdown.metric_refs,
				pipeline_refs=breakdown.pipeline_refs,
				topic_count=len(topic_ids),
				rows=sum(rows_by_topic.get(tid, 0) for tid in topic_ids),
			))
		value_ranking = sorted(
			value_ranking,
			key=lambda x: (-x.composite_score, -x.rows, x.name or ''),
		)[:10]

		# storage ranking: topics ordered by rows desc
		storage_ranking = sorted(
			topic_sizes,
			key=lambda x: -x.rows,
		)[:10]

		# inventory ranking: products grouped by catalog
		product_count_by_catalog: Dict[str, int] = {}
		for p in products:
			key = p.catalog_id or ''
			product_count_by_catalog[key] = product_count_by_catalog.get(key, 0) + 1
		inventory_ranking: List[CatalogRank] = []
		for catalog in catalogs:
			inventory_ranking.append(CatalogRank(
				catalog_id=catalog.id,
				name=catalog.name,
				product_count=product_count_by_catalog.pop(catalog.id, 0),
			))
		# products pointing to a deleted catalog fall into '未分类'
		uncategorized = sum(product_count_by_catalog.values())
		if uncategorized > 0:
			inventory_ranking.append(CatalogRank(catalog_id=None, name='Uncategorized', product_count=uncategorized))
		inventory_ranking = sorted(inventory_ranking, key=lambda x: -x.product_count)[:10]

		# domain ranking
		domain_grouped: Dict[str, DomainRank] = {}
		for p in products:
			domain = p.domain or 'Uncategorized'
			if domain not in domain_grouped:
				domain_grouped[domain] = DomainRank(domain=domain, product_count=0, rows=0)
			domain_grouped[domain].product_count += 1
			domain_grouped[domain].rows += sum(rows_by_topic.get(tid, 0) for tid in (p.topic_ids or []))
		domain_ranking = sorted(domain_grouped.values(), key=lambda x: -x.product_count)[:10]

		# storage trend from historical snapshots
		storage_trend = snapshot_service.list_snapshots()

		return AssetMapResponse(
			total_topics=len(topics),
			total_rows=total_rows,
			total_factors=total_factors,
			total_products=len(products),
			total_datasources=total_datasources,
			total_catalogs=len(catalogs),
			value_ranking=value_ranking,
			storage_ranking=storage_ranking,
			inventory_ranking=inventory_ranking,
			domain_ranking=domain_ranking,
			storage_trend=storage_trend,
			topic_sizes=topic_sizes,
			generated_at=datetime.now().isoformat(),
		)

	# statistics is read-only; run catalog/product/snapshot services in one readonly transaction
	return trans_readonly(catalog_service, action)


def create_snapshot(principal_service: PrincipalService) -> AssetSnapshot:
	catalog_service, product_service, snapshot_service, topic_service = \
		get_principal_services(principal_service)

	def action() -> AssetSnapshot:
		tenant_id = principal_service.get_tenant_id()
		topics = topic_service.find_all(tenant_id) if is_not_blank(tenant_id) else topic_service.find_all(None)
		products = product_service.list_products()
		topic_sizes = collect_topic_sizes(topics, principal_service)
		snapshot = AssetSnapshot(
			snapshot_date=datetime.now().strftime('%Y-%m-%d'),
			total_topics=len(topics),
			total_rows=sum(s.rows for s in topic_sizes),
			total_factors=sum(s.factors for s in topic_sizes),
			product_count=len(products),
			topic_sizes=topic_sizes,
		)
		snapshot.tenantId = tenant_id
		return snapshot_service.create(snapshot)

	return trans_readonly(catalog_service, action)


__all__ = [
	'AssetMapResponse', 'ProductRank', 'CatalogRank', 'DomainRank',
	'build_asset_map', 'create_snapshot', 'collect_topic_sizes', 'count_topic_rows',
]
