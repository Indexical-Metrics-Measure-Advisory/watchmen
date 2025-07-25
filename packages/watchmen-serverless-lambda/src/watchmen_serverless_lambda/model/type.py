from enum import StrEnum


class ListenerType(StrEnum):
    EVENT = "event"
    TABLE = "table"
    RECORD = "record"
    JSON = "json"
    TASK = "task"
    
    
class ActionType(StrEnum):
    MONITOR_EVENT = "monitor_event"
    EXTRACT_TABLE = "extract_table"
    SAVE_RECORD = "save_record"
    BUILD_JSON = "build_json"
    POST_JSON = "post_json"
    RUN_TASK = "run_task"
    ASSIGN_RECORD = "assign_record"
    ASSIGN_JSON = "assign_json"
    ASSIGN_TASK = "assign_task"