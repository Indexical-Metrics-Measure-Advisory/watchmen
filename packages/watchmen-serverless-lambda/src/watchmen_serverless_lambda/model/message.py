from enum import StrEnum
from typing import List, Optional, Dict, Union

from watchmen_collector_kernel.model import TriggerTable, ChangeDataRecord
from watchmen_utilities import ExtendedBaseModel, ArrayHelper


class ActionType(StrEnum):
    MONITOR_EVENT = "monitor_event"
    TABLE_EXTRACTOR = "table_extractor"
    RECORD_TO_JSON = "record_to_json"
   

class ActionMessage(ExtendedBaseModel):
    action: Optional[ActionType] = None



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


class TableExtractorMessage(ActionMessage):
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