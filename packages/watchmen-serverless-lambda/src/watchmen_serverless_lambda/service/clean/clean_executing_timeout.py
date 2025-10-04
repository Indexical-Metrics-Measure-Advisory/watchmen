from datetime import datetime, timedelta

from watchmen_collector_kernel.storage import ChangeDataRecordService, ChangeDataJsonService, ScheduledTaskService
from watchmen_utilities import ArrayHelper


def clean_record_executing_timeout(tenant_id: str,
                                   change_data_record_service: ChangeDataRecordService,
                                   timeout: float):
    query_time = datetime.now() - timedelta(seconds=timeout)
    records = change_data_record_service.find_records_by_timeout(tenant_id, query_time, 1)
    if records:
       record_ids = ArrayHelper(records).map(lambda record: record.change_data_id).to_list()
       try:
           change_data_record_service.begin_transaction()
           change_data_record_service.update_by_ids(record_ids, {"status": 0})
           change_data_record_service.commit_transaction()
       except Exception as e:
           change_data_record_service.rollback_transaction()
           raise e
       finally:
           change_data_record_service.close_transaction()


def clean_json_executing_timeout(tenant_id: str,
                                 change_data_json_service: ChangeDataJsonService,
                                 timeout: float):
    query_time = datetime.now() - timedelta(seconds=timeout)
    jsons = change_data_json_service.find_jsons_by_timeout(tenant_id, query_time, 1)
    if jsons:
       json_ids = ArrayHelper(jsons).map(lambda item: item.change_json_id).to_list()
       try:
           change_data_json_service.begin_transaction()
           change_data_json_service.update_by_ids(json_ids, {"status": 0})
           change_data_json_service.commit_transaction()
       except Exception as e:
           change_data_json_service.rollback_transaction()
           raise e
       finally:
           change_data_json_service.close_transaction()
           
def clean_task_executing_timeout(tenant_id: str,
                                 scheduled_task_service: ScheduledTaskService,
                                 timeout: float):
    query_time = datetime.now() - timedelta(seconds=timeout)
    tasks = scheduled_task_service.find_tasks_by_timeout(tenant_id, query_time, 1)
    if tasks:
       tasks_ids = ArrayHelper(tasks).map(lambda item: item.task_id).to_list()
       try:
           scheduled_task_service.begin_transaction()
           scheduled_task_service.update_by_ids(tasks_ids, {"status": 0})
           scheduled_task_service.commit_transaction()
       except Exception as e:
           scheduled_task_service.rollback_transaction()
           raise e
       finally:
           scheduled_task_service.close_transaction()