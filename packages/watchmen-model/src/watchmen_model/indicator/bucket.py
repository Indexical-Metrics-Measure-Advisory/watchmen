from enum import Enum
from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import BucketId, DataModel, EnumId, OptimisticLock, TenantBasedTuple
from watchmen_utilities import ArrayHelper
from .measure_method import MeasureMethod


class BucketType(str, Enum):
	VALUE = 'value'
	VALUE_MEASURE = 'value-measure'
	CATEGORY_MEASURE = 'category-measure'
	ENUM_MEASURE = 'enum-measure'


class RangeBucketValueIncluding(str, Enum):
	INCLUDE_MIN = "include-min"
	INCLUDE_MAX = "include-max"


class BucketSegment(DataModel, BaseModel):
	name: str = None
	value: Any = None


def construct_bucket_segment(
		segment: Optional[Union[dict, BucketSegment]], bucket_type: BucketType) -> Optional[BucketSegment]:
	if segment is None:
		return None
	elif isinstance(segment, BucketSegment):
		return segment
	elif bucket_type == BucketType.VALUE or bucket_type == BucketType.VALUE_MEASURE:
		return NumericValueSegment(**segment)
	elif bucket_type == BucketType.ENUM_MEASURE or bucket_type == BucketType.CATEGORY_MEASURE:
		return CategorySegment(**segment)
	else:
		raise Exception(f'Bucket type[{bucket_type}] cannot be recognized.')


def construct_bucket_segments(
		subjects: List[Union[dict, BucketSegment]], bucket_type: BucketType) -> List[BucketSegment]:
	if subjects is None:
		return []
	return ArrayHelper(subjects).map(lambda x: construct_bucket_segment(x, bucket_type)).to_list()


class Bucket(TenantBasedTuple, OptimisticLock, BaseModel):
	bucketId: BucketId = None
	name: str = None
	type: BucketType = None
	segments: List[BucketSegment] = None
	description: str = None

	def __setattr__(self, name, value):
		if name == 'segments':
			if self.type is not None:
				super().__setattr__(name, construct_bucket_segments(value, self.type))
			else:
				super().__setattr__(name, value)
		elif name == 'type':
			if self.segments is not None:
				super().__setattr__(name, construct_bucket_segments(self.segments, value))
			else:
				super().__setattr__(name, value)
		else:
			super().__setattr__(name, value)


class NumericSegmentValue(DataModel, BaseModel):
	min: str = None
	max: str = None


def construct_numeric_segment_value(
		segment_value: Optional[Union[dict, NumericSegmentValue]]) -> Optional[NumericSegmentValue]:
	if segment_value is None:
		return None
	elif isinstance(segment_value, NumericSegmentValue):
		return segment_value
	else:
		return NumericSegmentValue(**segment_value)


class NumericValueSegment(BucketSegment):
	value: NumericSegmentValue

	def __setattr__(self, name, value):
		if name == 'value':
			super().__setattr__(name, construct_numeric_segment_value(value))
		else:
			super().__setattr__(name, value)


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


OtherCategorySegmentValue = Literal['&others']

CategorySegmentValue = List[Union[str, OtherCategorySegmentValue]]


class CategorySegment(BucketSegment):
	value: CategorySegmentValue


class CategorySegmentsHolder(Bucket):
	segments: List[CategorySegment]


class CategoryMeasureBucket(CategorySegmentsHolder, MeasureBucket):
	type: BucketType.CATEGORY_MEASURE = BucketType.CATEGORY_MEASURE
	measure: Union[
		MeasureMethod.CONTINENT, MeasureMethod.REGION, MeasureMethod.COUNTRY,
		MeasureMethod.PROVINCE, MeasureMethod.CITY, MeasureMethod.DISTRICT,
		MeasureMethod.RESIDENCE_TYPE,
		MeasureMethod.GENDER, MeasureMethod.OCCUPATION, MeasureMethod.RELIGION, MeasureMethod.NATIONALITY,
		MeasureMethod.BIZ_TRADE,
		MeasureMethod.BOOLEAN
	]


class EnumMeasureBucket(CategorySegmentsHolder, MeasureBucket):
	type: BucketType.ENUM_MEASURE = BucketType.ENUM_MEASURE
	measure: MeasureMethod.ENUM = MeasureMethod.ENUM
	enumId: EnumId
