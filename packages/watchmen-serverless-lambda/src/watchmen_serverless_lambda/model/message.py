from enum import StrEnum
from typing import List, Optional, Dict, Union

from watchmen_collector_kernel.model import TriggerTable, ChangeDataRecord, ChangeDataJson, TriggerEvent, \
    CollectorModelConfig, ScheduledTask
from watchmen_model.common import TenantId, Storable
from watchmen_utilities import ExtendedBaseModel, ArrayHelper


class ActionType(StrEnum):
    MONITOR_EVENT = "monitor_event"
    TABLE_EXTRACTOR = "table_extractor"
    RECORD_TO_JSON = "record_to_json"
    POST_JSON = "post_json"
    SCHEDULED_TASK = "scheduled_task"
   

class ActionMessage(ExtendedBaseModel):
    action: Optional[ActionType] = None
    tenantId: Optional[TenantId] = None



def construct_trigger_table(trigger_table: Optional[Union[TriggerTable, Dict]]) -> Optional[TriggerTable]:
    if trigger_table is None:
        return None
    else:
        return TriggerTable(**trigger_table)


def construct_trigger_tables(trigger_tables: Optional[List[Union[TriggerTable, Dict]]]) -> Optional[List[TriggerTable]]:
    if trigger_tables is None:
        return None
    else:
        return ArrayHelper(trigger_tables).map(lambda x: construct_trigger_table(x)).to_list()


class TableExtractorMessage(Storable, ActionMessage):
    triggerTable: Optional[TriggerTable] = None
    records: Optional[List[Dict]] = None
    
    def __setattr__(self, name, value):
        if name == 'triggerTable':
            super().__setattr__(name, construct_trigger_table(value))
        else:
            super().__setattr__(name, value)


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


class RecordToJSONMessage(ActionMessage):
    records: Optional[List[ChangeDataRecord]] = None
    
    def __setattr__(self, name, value):
        if name == 'records':
            super().__setattr__(name, construct_records(value))
        else:
            super().__setattr__(name, value)


def construct_json(json: Optional[Union[ChangeDataJson, Dict]]) -> Optional[ChangeDataJson]:
    if json is None:
        return None
    else:
        return ChangeDataJson(**json)

def construct_jsons(jsons: Optional[List[Union[ChangeDataRecord, Dict]]]) -> Optional[List[ChangeDataRecord]]:
    if jsons is None:
        return None
    else:
        return ArrayHelper(jsons).map(lambda x: construct_json(x)).to_list()


class PostJSONMessage(ActionMessage):
    trigger_event: Optional[TriggerEvent] = None
    collector_model_config: Optional[CollectorModelConfig] = None
    jsons: Optional[List[ChangeDataJson]] = None
    
    def __setattr__(self, name, value):
        if name == 'jsons':
            super().__setattr__(name, construct_jsons(value))
        elif name == 'trigger_event':
            pass
        elif name == 'collector_model_config':
            pass
        else:
            super().__setattr__(name, value)


class GroupedJson(ExtendedBaseModel):
    object_id: Optional[str] = None
    sorted_jsons: Optional[List[ChangeDataJson]] = None
    
    def __setattr__(self, name, value):
        if name == 'sorted_json':
            super().__setattr__(name, construct_jsons(value))
        else:
            super().__setattr__(name, value)
    
    
    
def construct_grouped_json(grouped_json: Optional[Union[GroupedJson, Dict]]) -> Optional[GroupedJson]:
    if grouped_json is None:
        return None
    else:
        return GroupedJson(**grouped_json)
    

def construct_grouped_jsons(grouped_jsons: Optional[List[GroupedJson]]) -> Optional[List[List[ChangeDataRecord]]]:
    if grouped_jsons is None:
        return None
    else:
        return ArrayHelper(grouped_jsons).map(lambda x: construct_grouped_json(x)).to_list()
    

class PostGroupedJSONMessage(PostJSONMessage):
    grouped_jsons: Optional[List[GroupedJson]] = None
    
    def __setattr__(self, name, value):
        if name == 'grouped_jsons':
            super().__setattr__(name, construct_grouped_jsons(value))
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