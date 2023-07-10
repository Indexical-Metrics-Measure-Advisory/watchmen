from typing import Callable, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent, CollectorModelConfig, TriggerModel, TriggerTable, \
	CollectorTableConfig, TriggerModule, CollectorModuleConfig

from watchmen_collector_kernel.storage import TriggerModelService, TriggerTableService, TriggerEventService, \
	get_trigger_model_service, get_collector_model_config_service, get_trigger_table_service, \
	CollectorTableConfigService, get_collector_table_config_service, get_collector_module_config_service, \
	get_trigger_module_service, TriggerModuleService, CollectorModelConfigService
from watchmen_meta.common import TupleService
from watchmen_model.common import Storable

from watchmen_rest.util import validate_tenant_id


# noinspection SpellCheckingInspection
def redress_storable_id(tuple_service: TupleService,
                        a_tuple: Storable) -> None:
	tuple_id = tuple_service.get_storable_id(a_tuple)
	if tuple_service.is_storable_id_faked(tuple_id):
		tuple_service.redress_storable_id(a_tuple)


def new_trigger_module(module_name: str, priority: int, event_trigger_id: int, tenant_id: str) -> TriggerModule:
	return TriggerModule(
		moduleName=module_name,
		priority=priority,
		is_finished=False,
		eventTriggerId=event_trigger_id,
		tenantId=tenant_id
	)


def get_trigger_module(event_trigger: TriggerEvent, module_config: CollectorModuleConfig) -> TriggerModule:
	return new_trigger_module(module_config.moduleName,
	                          module_config.priority,
	                          event_trigger.eventTriggerId,
	                          event_trigger.tenantId)


def save_trigger_module(trigger_module_service: TriggerModuleService,
                        trigger_module: TriggerModule,
                        principal_service: PrincipalService) -> TriggerModule:
	validate_tenant_id(trigger_module, principal_service)
	redress_storable_id(trigger_module_service, trigger_module)
	# noinspection PyTypeChecker
	return trigger_module_service.create(trigger_module)


def get_trigger_module_action(trigger_event_service: TriggerEventService,
                              trigger_event: TriggerEvent) -> Callable[[CollectorModuleConfig], TriggerModule]:
	def create_trigger_module_action(module_config: CollectorModuleConfig) -> TriggerModule:
		trigger_module = get_trigger_module(trigger_event, module_config)
		trigger_module_service = get_trigger_module_service(trigger_event_service.storage,
		                                                    trigger_event_service.snowflakeGenerator,
		                                                    trigger_event_service.principalService)
		return save_trigger_module(trigger_module_service,
		                           trigger_module,
		                           trigger_event_service.principalService)

	return create_trigger_module_action


def new_trigger_model(model_name: str,
                      priority: int,
                      module_trigger_id: int,
                      event_trigger_id: int,
                      tenant_id: str) -> TriggerModel:
	return TriggerModel(
		modelName=model_name,
		priority=priority,
		isFinished=False,
		moduleTriggerId=module_trigger_id,
		eventTriggerId=event_trigger_id,
		tenantId=tenant_id
	)


def get_trigger_model(module_trigger: TriggerModule, model_config: CollectorModelConfig) -> TriggerModel:
	return new_trigger_model(model_config.modelName,
	                         model_config.priority,
	                         module_trigger.moduleTriggerId,
	                         module_trigger.eventTriggerId,
	                         module_trigger.tenantId)


def save_trigger_model(trigger_model_service: TriggerModelService,
                       trigger_model: TriggerModel,
                       principal_service: PrincipalService) -> TriggerModel:
	validate_tenant_id(trigger_model, principal_service)
	redress_storable_id(trigger_model_service, trigger_model)
	# noinspection PyTypeChecker
	return trigger_model_service.create(trigger_model)


def get_trigger_model_action(trigger_module_service: TriggerModuleService,
                             trigger_module: TriggerModule) -> Callable[[CollectorModelConfig], TriggerModel]:
	def create_trigger_model_action(model_config: CollectorModelConfig) -> TriggerModel:
		trigger_model = get_trigger_model(trigger_module, model_config)
		trigger_model_service = get_trigger_model_service(trigger_module_service.storage,
		                                                  trigger_module_service.snowflakeGenerator,
		                                                  trigger_module_service.principalService)
		return save_trigger_model(trigger_model_service,
		                          trigger_model,
		                          trigger_module_service.principalService)

	return create_trigger_model_action


def get_model_configs_by_module(collector_model_config_service: CollectorModelConfigService,
                                module_config: CollectorModuleConfig) -> List[CollectorModelConfig]:
	return collector_model_config_service.find_by_module_id(module_config.moduleId)


def new_trigger_table(table_name: str,
                      model_name: str,
                      model_trigger_id: int,
                      module_trigger_id: int,
                      event_trigger_id: int,
                      tenant_id: str) -> TriggerTable:
	return TriggerTable(
		tableName=table_name,
		dataCount=0,
		modelName=model_name,
		isExtracted=False,
		modelTriggerId=model_trigger_id,
		moduleTriggerId=module_trigger_id,
		eventTriggerId=event_trigger_id,
		tenantId=tenant_id
	)


def get_trigger_table(model_trigger: TriggerModel, table_config: CollectorTableConfig) -> TriggerTable:
	return new_trigger_table(table_config.tableName,
	                         table_config.modelName,
	                         model_trigger.modelTriggerId,
	                         model_trigger.moduleTriggerId,
	                         model_trigger.eventTriggerId,
	                         model_trigger.tenantId)


def save_trigger_table(trigger_table_service: TriggerTableService,
                       trigger_table: TriggerTable,
                       principal_service: PrincipalService) -> None:
	validate_tenant_id(trigger_table, principal_service)
	redress_storable_id(trigger_table_service, trigger_table)
	trigger_table_service.create(trigger_table)


def get_trigger_table_action(trigger_model_service: TriggerModelService,
                             trigger_model: TriggerModel) -> Callable[[CollectorTableConfig], TriggerTable]:
	def create_trigger_table_action(table_config: CollectorTableConfig) -> TriggerTable:
		trigger_table = get_trigger_table(trigger_model, table_config)
		trigger_table_service = get_trigger_table_service(trigger_model_service.storage,
		                                                  trigger_model_service.snowflakeGenerator,
		                                                  trigger_model_service.principalService)
		# noinspection PyTypeChecker
		return save_trigger_table(trigger_table_service,
		                          trigger_table,
		                          trigger_table_service.principalService)

	return create_trigger_table_action


def get_table_configs_by_model(collector_table_config_service: CollectorTableConfigService,
                               model_config: CollectorModelConfig) -> List[CollectorTableConfig]:
	return collector_table_config_service.find_by_model_name(model_config.modelName)


def trigger_collector(trigger_event_service: TriggerEventService,
                      trigger_event: TriggerEvent,
                      principal_service: PrincipalService) -> TriggerEvent:
	trigger_event_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		trigger_event = trigger_event_service.create(trigger_event)
		module_config_service = get_collector_module_config_service(trigger_event_service.storage,
		                                                            trigger_event_service.snowflakeGenerator,
		                                                            trigger_event_service.principalService)
		module_configs = module_config_service.find_by_tenant(principal_service.get_tenant_id())
		# noinspection PyTypeChecker
		trigger_module_action = get_trigger_module_action(trigger_event_service, trigger_event)
		trigger_module_service = get_trigger_module_service(trigger_event_service.storage,
		                                                    trigger_event_service.snowflakeGenerator,
		                                                    trigger_event_service.principalService)
		model_config_service = get_collector_model_config_service(trigger_event_service.storage,
		                                                          trigger_event_service.snowflakeGenerator,
		                                                          trigger_event_service.principalService)
		# model_configs = model_config_service.find_by_tenant(principal_service.get_tenant_id())
		# noinspection PyTypeChecker
		trigger_model_action = get_trigger_model_action(trigger_event_service, trigger_event)
		trigger_model_service = get_trigger_model_service(trigger_event_service.storage,
		                                                  trigger_event_service.snowflakeGenerator,
		                                                  trigger_event_service.principalService)
		# noinspection PyTypeChecker
		table_config_service = get_collector_table_config_service(trigger_event_service.storage,
		                                                          trigger_event_service.snowflakeGenerator,
		                                                          trigger_event_service.principalService)

		for module_config in module_configs:
			trigger_module = trigger_module_action(module_config)
			trigger_model_action = get_trigger_model_action(trigger_module_service, trigger_module)
			model_configs = get_model_configs_by_module(model_config_service, module_config)
			for model_config in model_configs:
				trigger_model = trigger_model_action(model_config)
				trigger_table_action = get_trigger_table_action(trigger_model_service, trigger_model)
				table_configs = get_table_configs_by_model(table_config_service, model_config)
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


def get_trigger_collector() -> Callable[[TriggerEventService,
                                         TriggerEvent,
                                         PrincipalService], TriggerEvent]:
	return trigger_collector
