from enum import Enum
from typing import Any, List, Union

from pydantic import BaseModel

from watchmen.model.common import BucketId, EnumId, TenantId, Tuple
from watchmen.model.indicator import MeasureMethod


class BucketType(str, Enum):
	VALUE = 'value'
	VALUE_MEASURE = 'value-measure'
	CATEGORY_MEASURE = 'category-measure'
	ENUM_MEASURE = 'enum-measure'


class RangeBucketValueIncluding(str, Enum):
	INCLUDE_MIN = "include-min"
	INCLUDE_MAX = "include-max"


class BucketSegment(BaseModel):
	name: str = None
	value: Any = None


class Bucket(Tuple):
	bucketId: BucketId = None
	name: str = None
	type: BucketType = None
	segments: List[BucketSegment] = None
	description: str = None
	tenantId: TenantId = None


class NumericSegmentValue(BaseModel):
	min: str = None
	max: str = None


class NumericValueSegment(BucketSegment):
	value: NumericSegmentValue


class NumericSegmentsHolder(Bucket):
	include: RangeBucketValueIncluding = None
	segments: List[NumericValueSegment]


class NumericValueBucket(NumericSegmentsHolder):
	type: BucketType.VALUE = BucketType.VALUE


class MeasureBucket(Bucket):
	measure: MeasureMethod = None


class NumericValueMeasureBucket(MeasureBucket, NumericSegmentsHolder):
	type: BucketType.VALUE_MEASURE = BucketType.VALUE_MEASURE
	measure: Union[
		MeasureMethod.FLOOR, MeasureMethod.RESIDENTIAL_AREA, MeasureMethod.AGE, MeasureMethod.BIZ_SCALE
	] = None


OtherCategorySegmentValue = '&others'

CategorySegmentValue = List[Union[str, OtherCategorySegmentValue]]


class CategorySegment(BucketSegment):
	value: CategorySegmentValue


class CategorySegmentsHolder(Bucket):
	segments: List[CategorySegment]


class CategoryMeasureBucket(CategorySegmentsHolder, MeasureBucket):
	type: BucketType.CATEGORY_MEASURE = BucketType.CATEGORY_MEASURE
	measure: Union[
		MeasureMethod.CONTINENT, MeasureMethod.REGION, MeasureMethod.COUNTRY, MeasureMethod.PROVINCE, MeasureMethod.CITY, MeasureMethod.DISTRICT,
		MeasureMethod.RESIDENCE_TYPE,
		MeasureMethod.GENDER, MeasureMethod.OCCUPATION, MeasureMethod.RELIGION, MeasureMethod.NATIONALITY,
		MeasureMethod.BIZ_TRADE,
		MeasureMethod.BOOLEAN
	]


class EnumMeasureBucket(CategorySegmentsHolder, MeasureBucket):
	type: BucketType.ENUM_MEASURE = BucketType.ENUM_MEASURE
	measure: MeasureMethod.ENUM = MeasureMethod.ENUM
	enumId: EnumId
