from typing import Dict, List, Optional, Union

from watchmen_model.common import TenantBasedTuple, Storable, OptimisticLock
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class FieldsMapping(ExtendedBaseModel):
    sourceFieldName: Optional[str] = None
    targetFieldName: Optional[str] = None


def construct_fields_mapping(fields_mapping: Union[FieldsMapping, Dict]) -> Optional[FieldsMapping]:
    if fields_mapping is None:
        return None
    elif isinstance(fields_mapping, FieldsMapping):
        return fields_mapping
    else:
        return FieldsMapping(**fields_mapping)


def construct_fields_mappings(fields_mappings: Optional[List[Union[FieldsMapping, Dict]]]) -> Optional[
    List[FieldsMapping]]:
    if fields_mappings is None:
        return None
    else:
        return ArrayHelper(fields_mappings).map(lambda x: construct_fields_mapping(x)).to_list()

    
class BatchTableConfig(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
    configId: Optional[int] = None
    name: Optional[str] = None
    sourceTableName: Optional[str] = None
    targetTableName: Optional[str] = None
    fieldsMapping: Optional[List[FieldsMapping]] = None
    primaryKey: Optional[List[str]] = None
    actionType: Optional[str] = None
    pipelineId: Optional[str] = None
    loopEntityName: Optional[str] = None
    
    def __setattr__(self, name, value):
        if name == 'fieldsMapping':
            super().__setattr__(name, construct_fields_mappings(value))
        else:
            super().__setattr__(name, value)
