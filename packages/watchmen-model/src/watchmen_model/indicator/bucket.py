from datetime import datetime
from enum import Enum
from typing import Any, List, Literal, Optional, Union

from watchmen_model.common import BucketId, EnumId, OptimisticLock, TenantBasedTuple, TenantId, UserId
from watchmen_utilities import ArrayHelper, ExtendedBaseModel
from .measure_method import MeasureMethod


class BucketType(str, Enum):
    VALUE = 'value'
    VALUE_MEASURE = 'value-measure'
    CATEGORY_MEASURE = 'category-measure'
    ENUM_MEASURE = 'enum-measure'


class RangeBucketValueIncluding(str, Enum):
    INCLUDE_MIN = "include-min"
    INCLUDE_MAX = "include-max"


class BucketSegment(ExtendedBaseModel):
    name: Optional[str] = None
    value: Optional[Any] = None


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


class Bucket(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
    bucketId: Optional[BucketId] = None
    name: Optional[str] = None
    type: Optional[BucketType] = None
    segments: Optional[List[BucketSegment]] = None
    description: Optional[str] = None

    def __setattr__(self, name, value):
        if name == 'segments':
            if self.type is not None:
                super().__setattr__(name, construct_bucket_segments(value, self.type))
            else:
                super().__setattr__(name, value)
        elif name == 'type':
            if self.segments is not None:
                super().__setattr__("segments", construct_bucket_segments(self.segments, value))
                super().__setattr__(name, value)
        else:
            super().__setattr__(name, value)




class NumericSegmentValue(ExtendedBaseModel):
    min: Optional[str] = None
    max: Optional[str] = None


def construct_numeric_segment_value(
        segment_value: Optional[Union[dict, NumericSegmentValue]]) -> Optional[NumericSegmentValue]:
    if segment_value is None:
        return None
    elif isinstance(segment_value, NumericSegmentValue):
        return segment_value
    else:
        return NumericSegmentValue(**segment_value)


class NumericValueSegment(BucketSegment):
    value: Optional[NumericSegmentValue] = None

    def __setattr__(self, name, value):
        if name == 'value':
            super().__setattr__(name, construct_numeric_segment_value(value))
        else:
            super().__setattr__(name, value)


class NumericSegmentsHolder(Bucket):
    include: Optional[RangeBucketValueIncluding] = None
    segments: Optional[List[NumericValueSegment]] = []


class NumericValueBucket(NumericSegmentsHolder):
    type: BucketType = BucketType.VALUE


class MeasureBucket(Bucket):
    measure: Optional[MeasureMethod] = None

class BucketTenantAndAudit(ExtendedBaseModel):
    tenantId: Optional[TenantId] = None
    createdAt: Optional[datetime] = None
    createdBy: Optional[UserId] = None
    lastModifiedAt: Optional[datetime] = None
    lastModifiedBy: Optional[UserId] = None


class NumericValueMeasureBucket(BucketTenantAndAudit,MeasureBucket, NumericSegmentsHolder):
    type: BucketType = BucketType.VALUE_MEASURE
    measure: Optional[MeasureMethod] = None



OtherCategorySegmentValue = Literal['&others']

CategorySegmentValue = List[str]


class CategorySegment(BucketSegment):
    value: Optional[CategorySegmentValue] = None


class CategorySegmentsHolder(Bucket):
    segments: Optional[List[CategorySegment]] = []


class CategoryMeasureBucket(BucketTenantAndAudit,CategorySegmentsHolder, MeasureBucket):
    type: BucketType = BucketType.CATEGORY_MEASURE
    measure: Optional[MeasureMethod] = None



class EnumMeasureBucket(BucketTenantAndAudit,CategorySegmentsHolder, MeasureBucket):
    type: BucketType = BucketType.ENUM_MEASURE
    measure: MeasureMethod = MeasureMethod.ENUM
    enumId: Optional[EnumId] = None
