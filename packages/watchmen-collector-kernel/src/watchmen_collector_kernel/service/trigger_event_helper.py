from typing import Dict
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.model import TriggerEvent, TriggerTable, ChangeDataRecord, Status, TriggerModel, \
	TriggerModule

from watchmen_collector_kernel.storage import get_trigger_model_service, get_collector_model_config_service, \
	get_trigger_table_service, get_collector_table_config_service, get_collector_module_config_service, \
	get_trigger_module_service, get_change_data_record_service, get_trigger_event_service
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage, ask_super_admin

from .trigger_collector import get_trigger_module_action, get_trigger_model_action, get_model_configs_by_module, \
	get_trigger_table_action, save_trigger_table, save_trigger_model, save_trigger_module


def trigger_event_by_default(trigger_event: TriggerEvent):
	storage = ask_meta_storage()
	snowflake_generator = ask_snowflake_generator()
	principal_service = ask_super_admin()
	trigger_event_service = get_trigger_event_service(storage, snowflake_generator, principal_service)
	trigger_event_service.begin_transaction()
	try:

		trigger_event.status = Status.EXECUTING.value
		trigger_event_service.update(trigger_event)

		module_config_service = get_collector_module_config_service(trigger_event_service.storage,
		                                                            trigger_event_service.snowflakeGenerator,
		                                                            trigger_event_service.principalService)
		trigger_module_service = get_trigger_module_service(trigger_event_service.storage,
		                                                    trigger_event_service.snowflakeGenerator,
		                                                    trigger_event_service.principalService)
		model_config_service = get_collector_model_config_service(trigger_event_service.storage,
		                                                          trigger_event_service.snowflakeGenerator,
		                                                          trigger_event_service.principalService)
		trigger_model_service = get_trigger_model_service(trigger_event_service.storage,
		                                                  trigger_event_service.snowflakeGenerator,
		                                                  trigger_event_service.principalService)
		table_config_service = get_collector_table_config_service(trigger_event_service.storage,
		                                                          trigger_event_service.snowflakeGenerator,
		                                                          trigger_event_service.principalService)

		module_configs = module_config_service.find_by_tenant(trigger_event.tenantId)
		trigger_module_action = get_trigger_module_action(trigger_event_service, trigger_event)
		for module_config in module_configs:
			trigger_module = trigger_module_action(module_config)
			trigger_model_action = get_trigger_model_action(trigger_module_service, trigger_module)
			model_configs = get_model_configs_by_module(model_config_service, module_config)
			for model_config in model_configs:
				trigger_model = trigger_model_action(model_config)
				trigger_table_action = get_trigger_table_action(trigger_model_service, trigger_model)
				table_configs = table_config_service.find_by_model_name(model_config.modelName, trigger_event.tenantId)
				for table_config in table_configs:
					trigger_table_action(table_config)

		trigger_event_service.commit_transaction()
	except Exception as e:
		trigger_event_service.rollback_transaction()
		raise e
	finally:
		trigger_event_service.close_transaction()

	# noinspection PyTypeChecker
	return trigger_event


def trigger_event_by_table(trigger_event: TriggerEvent):
	storage = ask_meta_storage()
	snowflake_generator = ask_snowflake_generator()
	principal_service = ask_super_admin()
	trigger_event_service = get_trigger_event_service(storage, snowflake_generator, principal_service)

	module_config_service = get_collector_module_config_service(trigger_event_service.storage,
	                                                            trigger_event_service.snowflakeGenerator,
	                                                            trigger_event_service.principalService)
	model_config_service = get_collector_model_config_service(trigger_event_service.storage,
	                                                          trigger_event_service.snowflakeGenerator,
	                                                          trigger_event_service.principalService)
	table_config_service = get_collector_table_config_service(trigger_event_service.storage,
	                                                          trigger_event_service.snowflakeGenerator,
	                                                          trigger_event_service.principalService)

	table_config = table_config_service.find_by_table_name_and_tenant_id(trigger_event.tableName,
	                                                                     trigger_event.tenantId)
	model_config = model_config_service.find_by_name(table_config.modelName)

	module_config = module_config_service.find_by_module_id(model_config.moduleId)

	trigger_event_service.begin_transaction()
	try:

		trigger_event.status = Status.EXECUTING.value
		trigger_event_service.update(trigger_event)

		trigger_module_action = get_trigger_module_action(trigger_event_service, trigger_event)
		trigger_module = trigger_module_action(module_config)

		trigger_module_service = get_trigger_module_service(trigger_event_service.storage,
		                                                    trigger_event_service.snowflakeGenerator,
		                                                    trigger_event_service.principalService)
		trigger_model_action = get_trigger_model_action(trigger_module_service, trigger_module)
		trigger_model = trigger_model_action(model_config)

		trigger_model_service = get_trigger_model_service(trigger_event_service.storage,
		                                                  trigger_event_service.snowflakeGenerator,
		                                                  trigger_event_service.principalService)
		trigger_table_action = get_trigger_table_action(trigger_model_service, trigger_model)
		trigger_table_action(table_config)

		trigger_event_service.commit_transaction()
	except Exception as e:
		trigger_event_service.rollback_transaction()
		raise e
	finally:
		trigger_event_service.close_transaction()

	# noinspection PyTypeChecker
	return trigger_event


def trigger_event_by_records(trigger_event: TriggerEvent):
	storage = ask_meta_storage()
	snowflake_generator = ask_snowflake_generator()
	principal_service = ask_super_admin()
	trigger_event_service = get_trigger_event_service(storage, snowflake_generator, principal_service)

	module_config_service = get_collector_module_config_service(trigger_event_service.storage,
	                                                            trigger_event_service.snowflakeGenerator,
	                                                            trigger_event_service.principalService)
	model_config_service = get_collector_model_config_service(trigger_event_service.storage,
	                                                          trigger_event_service.snowflakeGenerator,
	                                                          trigger_event_service.principalService)
	table_config_service = get_collector_table_config_service(trigger_event_service.storage,
	                                                          trigger_event_service.snowflakeGenerator,
	                                                          trigger_event_service.principalService)

	table_config = table_config_service.find_by_table_name_and_tenant_id(trigger_event.tableName,
	                                                                     trigger_event.tenantId)
	model_config = model_config_service.find_by_name(table_config.modelName)
	module_config = module_config_service.find_by_module_id(model_config.moduleId)

	trigger_event_service.begin_transaction()
	try:

		trigger_event.status = Status.EXECUTING.value
		trigger_event_service.update(trigger_event)

		def new_trigger_module(module_name: str,
		                       priority: int,
		                       event_trigger_id: int,
		                       tenant_id: str) -> TriggerModule:
			return TriggerModule(
				moduleName=module_name,
				priority=priority,
				is_finished=True,
				eventTriggerId=event_trigger_id,
				tenantId=tenant_id
			)

		trigger_module = new_trigger_module(module_config.moduleName,
		                                    module_config.priority,
		                                    trigger_event.eventTriggerId,
		                                    trigger_event.tenantId)

		trigger_module_service = get_trigger_module_service(trigger_event_service.storage,
		                                                    trigger_event_service.snowflakeGenerator,
		                                                    trigger_event_service.principalService)

		save_trigger_module(trigger_module_service, trigger_module, trigger_module_service.principalService)

		def new_trigger_model(model_name: str,
		                      priority: int,
		                      module_trigger_id: int,
		                      event_trigger_id: int,
		                      tenant_id: str) -> TriggerModel:
			return TriggerModel(
				modelName=model_name,
				priority=priority,
				isFinished=True,
				moduleTriggerId=module_trigger_id,
				eventTriggerId=event_trigger_id,
				tenantId=tenant_id
			)

		trigger_model = new_trigger_model(model_config.modelName,
		                                  model_config.priority,
		                                  trigger_module.moduleTriggerId,
		                                  trigger_module.eventTriggerId,
		                                  trigger_module.tenantId)

		trigger_model_service = get_trigger_model_service(trigger_event_service.storage,
		                                                  trigger_event_service.snowflakeGenerator,
		                                                  trigger_event_service.principalService)

		save_trigger_model(trigger_model_service, trigger_model, trigger_model_service.principalService)

		def new_trigger_table(table_name: str,
		                      model_name: str,
		                      model_trigger_id: int,
		                      module_trigger_id: int,
		                      event_trigger_id: int,
		                      tenant_id: str) -> TriggerTable:
			return TriggerTable(
				tableName=table_name,
				dataCount=len(trigger_event.records),
				modelName=model_name,
				isExtracted=True,
				modelTriggerId=model_trigger_id,
				moduleTriggerId=module_trigger_id,
				eventTriggerId=event_trigger_id,
				tenantId=tenant_id
			)

		trigger_table = new_trigger_table(table_config.tableName,
		                                  table_config.modelName,
		                                  trigger_model.modelTriggerId,
		                                  trigger_model.moduleTriggerId,
		                                  trigger_model.eventTriggerId,
		                                  trigger_model.tenantId)
		trigger_table_service = get_trigger_table_service(trigger_model_service.storage,
		                                                  trigger_model_service.snowflakeGenerator,
		                                                  trigger_model_service.principalService)
		save_trigger_table(trigger_table_service, trigger_table, trigger_table_service.principalService)

		# noinspection PyShadowingNames
		def get_change_data_record(trigger_table: TriggerTable, data_id: Dict) -> ChangeDataRecord:
			return ChangeDataRecord(
				changeRecordId=ask_snowflake_generator().next_id(),
				modelName=trigger_table.modelName,
				tableName=trigger_table.tableName,
				dataId=data_id,
				isMerged=False,
				status=Status.INITIAL.value,
				tableTriggerId=trigger_table.tableTriggerId,
				modelTriggerId=trigger_table.modelTriggerId,
				moduleTriggerId=trigger_table.moduleTriggerId,
				eventTriggerId=trigger_table.eventTriggerId,
				tenantId=trigger_table.tenantId
			)

		change_data_record_service = get_change_data_record_service(trigger_table_service.storage,
		                                                            trigger_table_service.snowflakeGenerator,
		                                                            trigger_table_service.principalService)
		ArrayHelper(
			trigger_event.records
		).map(
			lambda record: get_change_data_record(trigger_table, record)
		).map(
			lambda record: change_data_record_service.create(record)
		)

		trigger_event_service.commit_transaction()
	except Exception as e:
		trigger_event_service.rollback_transaction()
		raise e
	finally:
		trigger_event_service.close_transaction()

	# noinspection PyTypeChecker
	return trigger_event
