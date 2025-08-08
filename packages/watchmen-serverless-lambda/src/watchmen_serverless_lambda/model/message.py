from typing import List, Optional, Dict, Union, Tuple

from watchmen_collector_kernel.model import TriggerTable, ChangeDataRecord, ChangeDataJson, TriggerEvent, \
    CollectorModelConfig, ScheduledTask
from watchmen_model.common import TenantId, Storable
from watchmen_utilities import ExtendedBaseModel, ArrayHelper
from .type import ActionType


def construct_trigger_event(trigger_event: Optional[Union[TriggerEvent, Dict]]) -> Optional[TriggerEvent]:
    if trigger_event is None:
        return None
    else:
        return TriggerEvent(**trigger_event)
    
    
class ActionMessage(Storable, ExtendedBaseModel):
    action: Optional[ActionType] = None
    tenantId: Optional[TenantId] = None
    triggerEvent: Optional[TriggerEvent] = None
    
    def __setattr__(self, name, value):
        if name == 'triggerEvent':
            super().__setattr__(name, construct_trigger_event(value))
        else:
            super().__setattr__(name, value)


def construct_trigger_table(trigger_table: Optional[Union[TriggerTable, Dict]]) -> Optional[TriggerTable]:
    if trigger_table is None:
        return None
    else:
        return TriggerTable(**trigger_table)


class ExtractTableMessage(ActionMessage):
    triggerTable: Optional[TriggerTable] = None
    
    def __setattr__(self, name, value):
        if name == 'triggerTable':
            super().__setattr__(name, construct_trigger_table(value))
        else:
            super().__setattr__(name, value)
            

class SaveRecordMessage(ExtractTableMessage):
    triggerTable: Optional[TriggerTable] = None
    records: Optional[List[ChangeDataRecord]] = None


class AssignRecordMessage(ActionMessage):
    pass


class AssignJsonMessage(ActionMessage):
    pass


class AssignTaskMessage(ActionMessage):
    pass


def construct_record(record: Optional[Union[ChangeDataRecord, Dict]]) -> Optional[ChangeDataRecord]:
    if record is None:
        return None
    else:
        return ChangeDataRecord(**record)


def construct_records(records: Optional[List[Union[ChangeDataRecord, Dict]]]) -> Optional[List[ChangeDataRecord]]:
    if records is None:
        return None
    else:
        return ArrayHelper(records).map(lambda x: construct_record(x)).to_list()


class BuildJSONMessage(ActionMessage):
    records: Optional[List[ChangeDataRecord]] = None
    
    def __setattr__(self, name, value):
        if name == 'records':
            super().__setattr__(name, construct_records(value))
        else:
            super().__setattr__(name, value)


def construct_json(json: Optional[Union[ChangeDataJson, Dict]]) -> Optional[ChangeDataJson]:
    if json is None:
        return None
    elif isinstance(json, ChangeDataJson):
        return json
    else:
        return ChangeDataJson(**json)

def construct_jsons(jsons: Optional[List[Union[ChangeDataRecord, Dict]]]) -> Optional[List[ChangeDataRecord]]:
    if jsons is None:
        return None
    else:
        return ArrayHelper(jsons).map(lambda x: construct_json(x)).to_list()


def construct_model_config(config: Optional[Union[CollectorModelConfig, Dict]]) -> Optional[CollectorModelConfig]:
    if config is None:
        return None
    elif isinstance(config, CollectorModelConfig):
        return config
    else:
        return CollectorModelConfig(**config)

    
class PostJSONMessage(ActionMessage):
    modelConfig: Optional[CollectorModelConfig] = None
    jsonIds: Optional[List[str]] = None
    
    def __setattr__(self, name, value):
        if name == 'modelConfig':
            super().__setattr__(name, construct_model_config(value))
        else:
            super().__setattr__(name, value)


class GroupedJson(Storable, ExtendedBaseModel):
    objectId: Optional[str] = None
    sortedJsons: Optional[List[ChangeDataJson]] = None
    
    def __setattr__(self, name, value):
        if name == 'sortedJsons':
            super().__setattr__(name, construct_jsons(value))
        else:
            super().__setattr__(name, value)
    
def construct_grouped_json(grouped_json: Optional[Union[GroupedJson, Dict]]) -> Optional[GroupedJson]:
    if grouped_json is None:
        return None
    if isinstance(grouped_json, GroupedJson):
        return grouped_json
    else:
        return GroupedJson(**grouped_json)
    

def construct_grouped_jsons(grouped_jsons: Optional[List[GroupedJson]]) -> Optional[List[List[ChangeDataRecord]]]:
    if grouped_jsons is None:
        return None
    else:
        return ArrayHelper(grouped_jsons).map(lambda x: construct_grouped_json(x)).to_list()
    

class PostGroupedJSONMessage(ActionMessage):
    modelConfig: Optional[CollectorModelConfig] = None
    groupedJsonIds: Optional[List[Tuple[str, List[int]]]] = None
    
    def __setattr__(self, name, value):
        if name == 'modelConfig':
            super().__setattr__(name, construct_model_config(value))
        else:
            super().__setattr__(name, value)

         
def construct_task(task: Optional[Union[ScheduledTask, Dict]]) -> Optional[ScheduledTask]:
    if task is None:
        return None
    else:
        return ScheduledTask(**task)


def construct_tasks(tasks: Optional[List[Union[ScheduledTask, Dict]]]) -> Optional[List[ScheduledTask]]:
    if tasks is None:
        return None
    else:
        return ArrayHelper(tasks).map(lambda x: construct_task(x)).to_list()


class ScheduledTaskMessage(ActionMessage):
    tasks: Optional[List[ScheduledTask]] = None
    
    def __setattr__(self, name, value):
        if name == 'tasks':
            super().__setattr__(name, construct_tasks(value))
        else:
            super().__setattr__(name, value)
