from datetime import datetime
from logging import getLogger
from typing import Dict, Any, List

import numpy as np
from .criteria_builder import CriteriaBuilder

from watchmen_collector_kernel.model import Condition

from watchmen_storage import EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaStatement, EntityCriteria, \
    EntityCriteriaOperator, EntityCriteriaJointConjunction, EntityCriteriaJoint
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def get_data_id(primary_key: List[str], data_: Dict[str, Any]) -> Dict:
    data_id = {}
    
    def set_data_id(column_name: str, data_dict: Dict):
        data_id[column_name] = data_dict.get(column_name)
    
    ArrayHelper(primary_key).each(lambda column_name: set_data_id(column_name, data_))
    return data_id


def build_data_id(primary_key: List[str], values: List) -> Dict:
    data_id = {}
    
    def set_data_id(column_name: str, index: int, data_list: List):
        data_id[column_name] = data_list[index]
    
    ArrayHelper(primary_key).each_with_index(lambda column_name, index: set_data_id(column_name, index, values))
    return data_id


def build_audit_column_criteria(audit_column_name: str, start_time: datetime, end_time: datetime) -> EntityCriteria:
    return [
        EntityCriteriaExpression(
            left=ColumnNameLiteral(columnName=audit_column_name),
            operator=EntityCriteriaOperator.GREATER_THAN,
            right=start_time),
        EntityCriteriaExpression(
            left=ColumnNameLiteral(columnName=audit_column_name),
            operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
            right=end_time),
    ]


def build_audit_columns_criteria(date_column: str, time_column: str, start_time: datetime,
                                 end_time: datetime) -> EntityCriteria:
    start_date = start_time.date()
    start_tm = start_time.time()
    end_date = end_time.date()
    end_tm = end_time.time()
    
    if start_date < end_date:
        return [
            EntityCriteriaJoint(
                conjunction=EntityCriteriaJointConjunction.OR,
                children=[
                    EntityCriteriaJoint(
                        conjunction=EntityCriteriaJointConjunction.AND,
                        children=[
                            EntityCriteriaExpression(
                                lefe=ColumnNameLiteral(columnName=date_column),
                                operator=EntityCriteriaOperator.GREATER_THAN,
                                right=start_date),
                            EntityCriteriaExpression(
                                left=ColumnNameLiteral(columnName=date_column),
                                operator=EntityCriteriaOperator.LESS_THAN,
                                right=end_date)
                        ]
                    ),
                    EntityCriteriaJoint(
                        conjunction=EntityCriteriaJointConjunction.AND,
                        children=[
                            EntityCriteriaExpression(
                                lefe=ColumnNameLiteral(columnName=date_column),
                                operator=EntityCriteriaOperator.EQUALS,
                                right=start_date),
                            EntityCriteriaExpression(
                                left=ColumnNameLiteral(columnName=time_column),
                                operator=EntityCriteriaOperator.GREATER_THAN,
                                right=start_tm)
                        ]
                    ),
                    EntityCriteriaJoint(
                        conjunction=EntityCriteriaJointConjunction.AND,
                        children=[
                            EntityCriteriaExpression(
                                lefe=ColumnNameLiteral(columnName=date_column),
                                operator=EntityCriteriaOperator.EQUALS,
                                right=end_date),
                            EntityCriteriaExpression(
                                left=ColumnNameLiteral(columnName=time_column),
                                operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
                                right=end_tm)
                        ]
                    )
                ]
            
            )]
    else:
        return [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName=date_column),
                operator=EntityCriteriaOperator.EQUALS,
                right=start_date),
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName=time_column),
                operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
                right=start_tm),
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName=time_column),
                operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
                right=end_tm),
        ]


def build_criteria_by_primary_key(data_id: Dict) -> List[EntityCriteriaExpression]:
    criteria = []
    for key, value in data_id.items():
        criteria.append(
            EntityCriteriaExpression(left=ColumnNameLiteral(columnName=key), right=value)
        )
    return criteria


def build_criteria_by_join_key(join_key: Condition, data: Dict) -> EntityCriteriaStatement:
    return CriteriaBuilder(data).build_statement(join_key)


def cal_array2d_diff(array_0: np.ndarray, array_1: np.ndarray) -> np.ndarray:
    array_0_rows = array_0.view([('', array_0.dtype)] * array_0.shape[1])
    array_1_rows = array_1.view([('', array_1.dtype)] * array_1.shape[1])
    return np.setdiff1d(array_0_rows, array_1_rows).view(array_0.dtype).reshape(-1, array_0.shape[1])
