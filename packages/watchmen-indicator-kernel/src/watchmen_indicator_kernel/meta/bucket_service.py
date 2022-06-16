from typing import List, Optional, Tuple

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import BucketId, DataPage, EnumId, Pageable, TenantId
from watchmen_model.indicator import Bucket, BucketType, CategoryMeasureBucket, EnumMeasureBucket, \
	MeasureBucket, MeasureMethod, NumericValueBucket, NumericValueMeasureBucket, RangeBucketValueIncluding
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class BucketShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def try_get_include(self, bucket: Bucket) -> Optional[RangeBucketValueIncluding]:
		if bucket.type == BucketType.VALUE:
			if isinstance(bucket, NumericValueBucket):
				return bucket.include
			else:
				return bucket.to_dict().get('include')
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def try_get_measure(self, bucket: Bucket) -> Optional[MeasureMethod]:
		if bucket.type == BucketType.VALUE_MEASURE \
				or bucket.type == BucketType.CATEGORY_MEASURE or bucket.type == BucketType.ENUM_MEASURE:
			if isinstance(bucket, MeasureBucket):
				return bucket.measure
			else:
				return bucket.to_dict().get('measure')
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def try_get_enum_id(self, bucket: Bucket) -> Optional[MeasureMethod]:
		if bucket.type == BucketType.ENUM_MEASURE:
			if isinstance(bucket, EnumMeasureBucket):
				return bucket.enumId
			else:
				return bucket.to_dict().get('enumId')
		else:
			return None

	def serialize(self, bucket: Bucket) -> EntityRow:
		return TupleShaper.serialize_tenant_based(bucket, {
			'bucket_id': bucket.bucketId,
			'name': bucket.name,
			'type': bucket.type,
			'include': self.try_get_include(bucket),
			'measure': self.try_get_measure(bucket),
			'enum_id': self.try_get_enum_id(bucket),
			'segments': ArrayHelper(bucket.segments).map(lambda x: x.to_dict()).to_list(),
			'description': bucket.description,
		})

	# noinspection PyMethodMayBeStatic
	def to_derived_bucket(self, bucket: Bucket) -> Bucket:
		if bucket.type == BucketType.VALUE:
			if not isinstance(bucket, NumericValueBucket):
				return NumericValueBucket(**bucket.to_dict())
		elif bucket.type == BucketType.VALUE_MEASURE:
			if not isinstance(bucket, NumericValueMeasureBucket):
				return NumericValueMeasureBucket(**bucket.to_dict())
		elif bucket.type == BucketType.CATEGORY_MEASURE:
			if not isinstance(bucket, CategoryMeasureBucket):
				return CategoryMeasureBucket(**bucket.to_dict())
		elif bucket.type == BucketType.ENUM_MEASURE:
			if not isinstance(bucket, EnumMeasureBucket):
				return EnumMeasureBucket(**bucket.to_dict())
		return bucket

	def deserialize(self, row: EntityRow) -> Bucket:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, self.to_derived_bucket(Bucket(
			bucketId=row.get('bucket_id'),
			name=row.get('name'),
			type=row.get('type'),
			include=row.get('include'),
			measure=row.get('measure'),
			enumId=row.get('enum_id'),
			segments=row.get('segments'),
			description=row.get('description'),
		)))


BUCKET_ENTITY_NAME = 'buckets'
BUCKET_ENTITY_SHAPER = BucketShaper()


class BucketService(TupleService):
	def get_entity_name(self) -> str:
		return BUCKET_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return BUCKET_ENTITY_SHAPER

	def get_storable_id(self, storable: Bucket) -> BucketId:
		return storable.bucketId

	def set_storable_id(self, storable: Bucket, storable_id: BucketId) -> Bucket:
		storable.bucketId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'bucket_id'

	# noinspection DuplicatedCode
	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	# noinspection DuplicatedCode
	def find_numeric_value_by_text(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Bucket]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='type'), right=BucketType.VALUE)
		]
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_measure_method(
			self, measure_methods: List[Tuple[MeasureMethod, Optional[EnumId]]], tenant_id: Optional[TenantId]
	) -> List[Bucket]:
		criteria = []
		non_enum_measure_methods = ArrayHelper(measure_methods) \
			.filter(lambda x: x[0] != MeasureMethod.ENUM and x[1] is None).map(lambda x: x[0]).to_list()
		enum_measure_methods = ArrayHelper(measure_methods) \
			.filter(lambda x: x[0] == MeasureMethod.ENUM and x[1] is not None).map(lambda x: x[1]).to_list()
		if len(non_enum_measure_methods) != 0 and len(enum_measure_methods) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='measure'),
						operator=EntityCriteriaOperator.IN, right=non_enum_measure_methods),
					EntityCriteriaJoint(
						conjunction=EntityCriteriaJointConjunction.AND,
						children=[
							EntityCriteriaExpression(
								left=ColumnNameLiteral(columnName='measure'), right=MeasureMethod.ENUM),
							EntityCriteriaExpression(
								left=ColumnNameLiteral(columnName='enum_id'),
								operator=EntityCriteriaOperator.IN, right=enum_measure_methods)
						])
				]
			))
		elif len(non_enum_measure_methods) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='measure'),
				operator=EntityCriteriaOperator.IN, right=non_enum_measure_methods))
		elif len(enum_measure_methods) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.AND,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='measure'), right=MeasureMethod.ENUM),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='enum_id'),
						operator=EntityCriteriaOperator.IN, right=enum_measure_methods)
				]
			))

		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_ids(self, topic_ids: List[BucketId], tenant_id: Optional[TenantId]) -> List[Bucket]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='bucket_id'), operator=EntityCriteriaOperator.IN, right=topic_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	# noinspection DuplicatedCode
	def find_all(self, tenant_id: Optional[TenantId]) -> List[Bucket]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
