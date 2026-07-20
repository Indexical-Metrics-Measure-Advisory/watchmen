from abc import abstractmethod
from copy import deepcopy
from logging import getLogger
from random import randrange
from traceback import format_exc
from typing import Any, Callable, Dict, List, Optional, Union

import asyncio

from sqlalchemy.exc import IntegrityError

from watchmen_auth import PrincipalService
from watchmen_data_kernel.external_writer import ask_external_writer_creator, ExternalWriter, \
	ExternalWriterParams
from watchmen_data_kernel.meta import ExternalWriterService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service_async
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.storage.async_data_service import AsyncTopicDataService
from watchmen_data_kernel.storage_bridge import now, parse_action_defined_as, parse_condition_for_storage, \
	parse_mapping_for_storage, parse_parameter_in_memory, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	ParsedMemoryConstantParameter, ParsedMemoryParameter, ParsedStorageCondition, ParsedStorageMapping, \
	PipelineVariables, PrerequisiteDefinedAs, PrerequisiteTest, spent_ms
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import AggregateArithmetic, AlarmAction, AlarmActionSeverity, CopyToMemoryAction, \
	DeleteTopicAction, DeleteTopicActionType, Factor, FindBy, FromTopic, MappingFactor, MappingRow, \
	Pipeline, PipelineAction, PipelineStage, PipelineTriggerType, PipelineUnit, ReadFactorAction, ReadFactorsAction, \
	ReadTopicAction, ReadTopicActionType, SystemActionType, Topic, ToTopic, WriteFactorAction, WriteToExternalAction, \
	WriteTopicAction, WriteTopicActionType
from watchmen_model.common import ConstantParameter, ParameterKind, VariablePredefineFunctions
from watchmen_model.pipeline_kernel import MonitorAlarmAction, MonitorCopyToMemoryAction, MonitorDeleteAction, \
	MonitorLogAction, MonitorLogStatus, MonitorLogUnit, MonitorReadAction, MonitorWriteAction, \
	MonitorWriteToExternalAction
from watchmen_pipeline_kernel.common import ask_decrypt_factor_value, ask_pipeline_update_retry, \
	ask_pipeline_update_retry_force, ask_pipeline_update_retry_interval, ask_pipeline_update_retry_times, \
	PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema_async.topic_storages import AsyncTopicStorages
from .create_queue_pipeline import CreateQueuePipeline
from watchmen_storage import EntityColumnAggregateArithmetic, EntityCriteria, EntityStraightAggregateColumn, \
	EntityStraightColumn
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_external_writer_service(principal_service: PrincipalService) -> ExternalWriterService:
	return ExternalWriterService(principal_service)


# noinspection DuplicatedCode
def find_topic_schema_for_action(action: Union[ToTopic, FromTopic], principal_service: PrincipalService) -> TopicSchema:
	topic_id = action.topicId
	if is_blank(topic_id):
		raise PipelineKernelException(f'Topic not declared in action[{action.dict()}].')
	topic_service = get_topic_service(principal_service)
	topic: Optional[Topic] = topic_service.find_by_id(topic_id)
	if topic is None:
		raise PipelineKernelException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise PipelineKernelException(f'Topic schema[id={topic_id}] not found.')
	return schema


class AsyncCompiledAction:
	def __init__(
			self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: PipelineAction,
			principal_service: PrincipalService):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.action = action
		self.actionDefinedAs = parse_action_defined_as(action)
		self.parse_action(action, principal_service)

	@abstractmethod
	def parse_action(self, action: PipelineAction, principal_service: PrincipalService) -> None:
		pass

	async def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		action_monitor_log = self.create_action_log(self.create_common_action_log())
		unit_monitor_log.actions.append(action_monitor_log)
		return await self.do_run(
			variables=variables, new_pipeline=new_pipeline, action_monitor_log=action_monitor_log,
			storages=storages, principal_service=principal_service)

	# noinspection PyMethodMayBeStatic
	async def safe_run(self, action_monitor_log: MonitorLogAction, work: Callable[[], Any]) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following.
		work may be a coroutine (awaitable) or a plain callable.
		"""
		# noinspection PyBroadException
		try:
			result = work()
			if hasattr(result, '__await__'):
				await result
			action_monitor_log.status = MonitorLogStatus.DONE
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			return True
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			action_monitor_log.status = MonitorLogStatus.ERROR
			action_monitor_log.error = format_exc()
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			return False

	@abstractmethod
	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		pass

	def create_common_action_log(self) -> Dict[str, Any]:
		return {
			# create uid of action monitor log
			'uid': str(ask_snowflake_generator().next_id()),
			'actionId': self.action.actionId, 'type': self.action.type,
			'status': MonitorLogStatus.DONE, 'startTime': now(), 'spentInMills': 0, 'error': None,
			'insertCount': 0, 'updateCount': 0, 'deleteCount': 0,
			'definedAs': self.actionDefinedAs(), 'touched': None
		}

	@abstractmethod
	def create_action_log(self, common: Dict[str, Any]) -> MonitorLogAction:
		pass


class AsyncCompiledAlarmAction(AsyncCompiledAction):
	prerequisiteDefinedAs: PrerequisiteDefinedAs
	prerequisiteTest: PrerequisiteTest
	severity: AlarmActionSeverity = AlarmActionSeverity.MEDIUM
	parsedMessage: Optional[ParsedMemoryParameter] = None

	def parse_action(self, action: AlarmAction, principal_service: PrincipalService) -> None:
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(action, principal_service)
		self.prerequisiteTest = parse_prerequisite_in_memory(action, principal_service)
		self.severity = AlarmActionSeverity.MEDIUM if action.severity is None else action.severity
		# construct a constant parameter
		self.parsedMessage = parse_parameter_in_memory(ConstantParameter(
			kind=ParameterKind.CONSTANT,
			value=action.message
		), principal_service)

	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorAlarmAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		try:
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				action_monitor_log.prerequisite = False
				action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
				action_monitor_log.status = MonitorLogStatus.DONE
				return True
			else:
				action_monitor_log.prerequisite = True

				# default log on error label
				def work() -> None:
					value = self.parsedMessage.value(variables, principal_service)
					action_monitor_log.touched = {'data': value}
					# logger.error(f'[PIPELINE] [ALARM] [{self.severity.upper()}] {value}')

				return await self.safe_run(action_monitor_log, work)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			action_monitor_log.status = MonitorLogStatus.ERROR
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			action_monitor_log.error = format_exc()
			return False

	def create_action_log(self, common: Dict[str, Any]) -> MonitorAlarmAction:
		return MonitorAlarmAction(**common, prerequisite=True, prerequisiteDefinedAs=self.prerequisiteDefinedAs())


class AsyncCompiledCopyToMemoryAction(AsyncCompiledAction):
	variableName: Optional[str] = None
	parsedSource: Optional[ParsedMemoryParameter] = None

	def parse_action(self, action: CopyToMemoryAction, principal_service: PrincipalService) -> None:
		if is_blank(action.variableName):
			raise PipelineKernelException(f'Variable not declared in copy to variable action.')
		self.variableName = action.variableName
		self.parsedSource = parse_parameter_in_memory(action.source, principal_service)

	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorCopyToMemoryAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			value = self.parsedSource.value(variables, principal_service)
			action_monitor_log.touched = {'data': value}
			if isinstance(self.parsedSource, ParsedMemoryConstantParameter) and self.action.source is not None:
				constant_value: Optional[str] = self.action.source.value
				if is_not_blank(constant_value):
					constant_value = constant_value.strip()
				if constant_value.startswith('{') and constant_value.endswith('}'):
					constant_value = constant_value.lstrip('{').rstrip('}')
				names = constant_value.split('.')
				if names[0].startswith(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value):
					# from trigger data, previous one
					variables.put_with_from(self.variableName, value, ArrayHelper(names[1:]).join('.'))
				elif variables.has(names[0]):
					# from variables
					traceable, from_ = variables.trace_variable(names[0])
					if traceable:
						variables.put_with_from(
							self.variableName, value, from_ + '.' + ArrayHelper(names[1:]).join('.'))
					else:
						variables.put(self.variableName, value)
				else:
					# from trigger data, current one
					variables.put_with_from(self.variableName, value, constant_value)
			else:
				variables.put(self.variableName, value)

		return await self.safe_run(action_monitor_log, work)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorCopyToMemoryAction:
		return MonitorCopyToMemoryAction(**common, value=None)


def build_external_write(
		build: Callable[[], ExternalWriter], event_code: Optional[str], pat: Optional[str], url: Optional[str]
) -> Callable[[PipelineVariables, PrincipalService], None]:
	# noinspection PyUnusedLocal
	def write(variables: PipelineVariables, principal_service: PrincipalService) -> None:
		cloned = variables.clone_all()
		build().run(ExternalWriterParams(
			pat=pat,
			url=url,
			eventCode=event_code,
			currentData=cloned.currentData,
			previousData=cloned.previousData,
			variables=cloned.variables
		))

	return write


class AsyncCompiledWriteToExternalAction(AsyncCompiledAction):
	eventCode: Optional[str] = None
	write: Optional[Callable[[PipelineVariables, PrincipalService], None]] = None

	def parse_action(self, action: WriteToExternalAction, principal_service: PrincipalService) -> None:
		writer_id = action.externalWriterId
		if is_blank(writer_id):
			raise PipelineKernelException(f'External writer not declared.')
		external_writer = get_external_writer_service(principal_service).find_by_id(writer_id)
		if external_writer is None:
			raise PipelineKernelException(f'External writer[id={writer_id}] not found.')
		code = external_writer.writerCode
		create = ask_external_writer_creator(code)
		if create is None:
			raise PipelineKernelException(f'Cannot find external writer[code={code}] creator.')
		self.write = build_external_write(
			lambda: create(code), action.eventCode, external_writer.pat, external_writer.url)

	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorWriteToExternalAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		return await self.safe_run(action_monitor_log, lambda: self.write(variables, principal_service))

	def create_action_log(self, common: Dict[str, Any]) -> MonitorWriteToExternalAction:
		return MonitorWriteToExternalAction(**common, value=None)


# noinspection PyAbstractClass
class AsyncCompiledStorageAction(AsyncCompiledAction):
	schema: Optional[TopicSchema] = None

	def parse_topic_schema(self, action: Union[ToTopic, FromTopic], principal_service: PrincipalService) -> None:
		self.schema = find_topic_schema_for_action(action, principal_service)

	def get_topic(self) -> Optional[Topic]:
		return self.schema.get_topic() if self.schema is not None else None

	def on_topic_message(self) -> str:
		topic = self.get_topic()
		return f'on topic[id={topic.topicId}, name={topic.name}]' if topic is not None else ''

	# noinspection PyMethodMayBeStatic
	async def ask_topic_data_service(
			self, schema: TopicSchema, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> AsyncTopicDataService:
		"""
		ask async topic data service
		"""
		storage = await storages.ask_topic_storage(schema)
		return await ask_topic_data_service_async(schema, storage, principal_service)


# noinspection PyAbstractClass
class AsyncCompiledFindByAction(AsyncCompiledStorageAction):
	parsedFindBy: Optional[ParsedStorageCondition] = None

	def parse_find_by(self, action: FindBy, principal_service: PrincipalService) -> None:
		if self.schema is None and isinstance(action, (FromTopic, ToTopic)):
			self.parse_topic_schema(action, principal_service)
		self.parsedFindBy = parse_condition_for_storage(action.by, [self.schema], principal_service, True)


# noinspection PyAbstractClass
class AsyncCompiledReadTopicAction(AsyncCompiledFindByAction):
	variableName: Optional[str] = None

	def parse_action(self, action: ReadTopicAction, principal_service: PrincipalService) -> None:
		if is_blank(action.variableName):
			raise PipelineKernelException(f'Variable not declared in read action.')
		self.variableName = action.variableName
		self.parse_topic_schema(action, principal_service)
		self.parse_find_by(action, principal_service)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorReadAction:
		return MonitorReadAction(**common, by=None, value=None)


class AsyncCompiledReadRowAction(AsyncCompiledReadTopicAction):
	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = await topic_data_service.find(criteria=[statement])
			count = len(data)
			if count == 0:
				raise PipelineKernelException(f'Data not found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			elif count > 1:
				raise PipelineKernelException(
					f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			else:
				value = data[0]
				if value is not None:
					if ask_decrypt_factor_value():
						value = self.schema.decrypt(value, principal_service)
				variables.put(self.variableName, value)
				action_monitor_log.touched = {'data': data}

		return await self.safe_run(action_monitor_log, work)


class AsyncCompiledReadRowsAction(AsyncCompiledReadTopicAction):
	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = await topic_data_service.find(criteria=[statement])
			if ask_decrypt_factor_value():
				data = ArrayHelper(data).map(lambda x: self.schema.decrypt(x, principal_service)).to_list()
			variables.put(self.variableName, data)
			action_monitor_log.touched = {'data': data}

		return await self.safe_run(action_monitor_log, work)


# noinspection PyAbstractClass
class AsyncCompiledReadTopicFactorAction(AsyncCompiledReadTopicAction):
	factor: Optional[Factor] = None

	def parse_action(
			self, action: Union[ReadFactorAction, ReadFactorsAction], principal_service: PrincipalService) -> None:
		super().parse_action(action, principal_service)
		factor_id = action.factorId
		if is_blank(factor_id):
			raise PipelineKernelException(f'Factor not declared in read factor(s) action.')
		topic = self.schema.get_topic()
		factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise PipelineKernelException(
				f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		self.factor = factor


class AsyncCompiledReadFactorAction(AsyncCompiledReadTopicFactorAction):
	aggregateArithmetic: Optional[AggregateArithmetic] = None

	def parse_action(
			self, action: ReadFactorAction, principal_service: PrincipalService) -> None:
		super().parse_action(action, principal_service)
		self.aggregateArithmetic = AggregateArithmetic.NONE if action.arithmetic is None else action.arithmetic

	def build_straight_column(self, topic_data_service: AsyncTopicDataService) -> EntityStraightColumn:
		factor_name = self.factor.name
		column_name = topic_data_service.get_data_entity_helper().get_column_name(self.factor.name)
		if self.aggregateArithmetic is None or self.aggregateArithmetic == AggregateArithmetic.NONE:
			return EntityStraightColumn(columnName=column_name, alias=factor_name)
		elif self.aggregateArithmetic == AggregateArithmetic.COUNT:
			return EntityStraightAggregateColumn(
				columnName=column_name,
				alias=factor_name,
				arithmetic=EntityColumnAggregateArithmetic.COUNT
			)
		elif self.aggregateArithmetic == AggregateArithmetic.SUM:
			return EntityStraightAggregateColumn(
				columnName=column_name,
				alias=factor_name,
				arithmetic=EntityColumnAggregateArithmetic.SUM
			)
		elif self.aggregateArithmetic == AggregateArithmetic.AVG:
			return EntityStraightAggregateColumn(
				columnName=column_name,
				alias=factor_name,
				arithmetic=EntityColumnAggregateArithmetic.AVG
			)
		else:
			raise PipelineKernelException(f'Aggregate arithmetic[{self.aggregateArithmetic}] is not supported.')

	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = await topic_data_service.find_straight_values(
				criteria=[statement], columns=[self.build_straight_column(topic_data_service)])
			if len(data) == 0:
				raise PipelineKernelException(f'Data not found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			else:
				value = data[0].popitem()[1]
				if value is not None:
					if self.aggregateArithmetic is None or self.aggregateArithmetic == AggregateArithmetic.NONE:
						if ask_decrypt_factor_value():
							value = self.schema.decrypt({self.factor.name: value}, principal_service) \
								.get(self.factor.name)
				variables.put(self.variableName, value)
				action_monitor_log.touched = {'data': value}

		return await self.safe_run(action_monitor_log, work)


class AsyncCompiledReadFactorsAction(AsyncCompiledReadTopicFactorAction):
	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			column_name = topic_data_service.get_data_entity_helper().get_column_name(self.factor.name)
			data = await topic_data_service.find_distinct_values(criteria=[statement], column_names=[column_name])
			factor_values = ArrayHelper(data).map(lambda x: x.get(self.factor.name)).to_list()
			if ask_decrypt_factor_value():
				factor_values = ArrayHelper(data) \
					.map(lambda x: self.schema.decrypt({self.factor.name: x}, principal_service)) \
					.map(lambda x: x.get(self.factor.name)) \
					.to_list()
			variables.put(self.variableName, factor_values)
			action_monitor_log.touched = {'data': factor_values}

		return await self.safe_run(action_monitor_log, work)


class AsyncCompiledExistsAction(AsyncCompiledReadTopicAction):
	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			existing = await topic_data_service.exists(criteria=[statement])
			variables.put(self.variableName, existing)

		return await self.safe_run(action_monitor_log, work)


# noinspection PyAbstractClass
class AsyncCompiledWriteTopicAction(AsyncCompiledFindByAction):
	parsedMapping: Optional[ParsedStorageMapping] = None

	def parse_mapping_factors(
			self, action: Union[ToTopic, FromTopic], factors: Optional[List[MappingFactor]],
			principal_service: PrincipalService) -> None:
		if self.schema is None:
			self.parse_topic_schema(action, principal_service)
		self.parsedMapping = parse_mapping_for_storage(self.schema, action, factors, principal_service)

	def parse_mapping_row(self, action: MappingRow, principal_service: PrincipalService) -> None:
		if not isinstance(action, ToTopic) and not isinstance(action, FromTopic):
			raise PipelineKernelException(f'Topic not declared in action[{action.dict()}].')
		self.parse_mapping_factors(action, action.mapping, principal_service)

	def parse_action(self, action: WriteTopicAction, principal_service: PrincipalService) -> None:
		self.parse_topic_schema(action, principal_service)
		if isinstance(action, FindBy):
			# insert row action has no find by
			self.parse_find_by(action, principal_service)
		if isinstance(action, MappingRow):
			self.parse_mapping_row(action, principal_service)
		if isinstance(action, WriteFactorAction):
			# make it as single factor mapping
			mapping_factors = [MappingFactor(
				arithmetic=action.arithmetic,
				factorId=action.factorId,
				source=action.source
			)]
			self.parse_mapping_factors(action, mapping_factors, principal_service)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorWriteAction:
		return MonitorWriteAction(**common, by=None, value=None)


# noinspection PyAbstractClass
class AsyncCompiledInsertion(AsyncCompiledWriteTopicAction):
	async def do_insert(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction,
			principal_service: PrincipalService, topic_data_service: AsyncTopicDataService,
			allow_failure: bool) -> bool:
		"""
		returns true when insert successfully.
		returns false when insert failed and given allow_failure is true.
		"""
		data = self.parsedMapping.run(None, variables, principal_service)
		self.schema.initialize_default_values(data)
		self.schema.cast_date_or_time(data)
		self.schema.encrypt(data, principal_service)
		try:
			data = await topic_data_service.insert(data)
		except IntegrityError as e:
			logger.error(e, exc_info=True, stack_info=True)
			if allow_failure:
				return False
			else:
				raise e
		action_monitor_log.insertCount = 1
		action_monitor_log.touched = {'data': data}
		# new pipeline
		has_id, id_ = topic_data_service.get_data_entity_helper().find_data_id(data)
		new_pipeline(self.schema, TopicTrigger(
			previous=None,
			current=data,
			triggerType=PipelineTriggerType.INSERT,
			internalDataId=id_
		))
		return True


# noinspection PyAbstractClass
class AsyncCompiledUpdate(AsyncCompiledWriteTopicAction):
	# noinspection PyMethodMayBeStatic
	def merge_into(self, original: Dict[str, Any], updated: Dict[str, Any]) -> Dict[str, Any]:
		cloned = deepcopy(original)
		for key, value in updated.items():
			cloned[key] = value
		return cloned

	def redress_update_data(
			self, original_data: Dict[str, Any], variables: PipelineVariables,
			principal_service: PrincipalService) -> Dict[str, Any]:
		updated_data = self.parsedMapping.run(original_data, variables, principal_service)
		updated_data = self.merge_into(original_data, updated_data)
		self.schema.initialize_default_values(updated_data)
		self.schema.cast_date_or_time(updated_data)
		self.schema.encrypt(updated_data, principal_service)
		return updated_data

	# noinspection PyUnusedLocal
	def post_update(
			self, topic_data_service: AsyncTopicDataService, new_pipeline: CreateQueuePipeline,
			original_data: Dict[str, Any], updated_data: Dict[str, Any],
			action_monitor_log: MonitorWriteAction,
			updated_count: int, criteria: EntityCriteria) -> int:
		if updated_count == 0:
			return 0
		else:
			# new pipeline
			has_id, id_ = topic_data_service.get_data_entity_helper().find_data_id(updated_data)
			new_pipeline(self.schema, TopicTrigger(
				previous=original_data,
				current=updated_data,
				triggerType=PipelineTriggerType.MERGE,
				internalDataId=id_
			))
			action_monitor_log.updateCount = 1
			action_monitor_log.touched = {'data': updated_data}
			return 1

	async def do_update(
			self, original_data: Dict[str, Any], variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction,
			principal_service: PrincipalService, topic_data_service: AsyncTopicDataService) -> int:
		updated_data = self.redress_update_data(original_data, variables, principal_service)
		updated_count, criteria = await topic_data_service.update_by_id_and_version(updated_data)
		return self.post_update(
			topic_data_service, new_pipeline, original_data, updated_data, action_monitor_log, updated_count, criteria)

	async def do_update_with_lock(
			self, original_data: Dict[str, Any], variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction,
			principal_service: PrincipalService, topic_data_service: AsyncTopicDataService) -> int:
		updated_data = self.redress_update_data(original_data, variables, principal_service)
		updated_count, criteria = await topic_data_service.update_with_lock_by_id(updated_data)
		return self.post_update(
			topic_data_service, new_pipeline, original_data, updated_data, action_monitor_log, updated_count, criteria)


class AsyncCompiledInsertRowAction(AsyncCompiledInsertion):
	async def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			await self.do_insert(variables, new_pipeline, action_monitor_log, principal_service, topic_data_service, False)

		return await self.safe_run(action_monitor_log, work)


class AsyncCompiledInsertOrMergeRowAction(AsyncCompiledInsertion, AsyncCompiledUpdate):
	async def do_insert_or_merge(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService,
			allow_insert: bool) -> bool:
		async def last_try() -> None:
			# force lock and update, the final try after all retries by optimistic lock are failed
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			# Use a managed transaction: begin_managed_async opens one connection+tx
			# and sets _managed=True so the data service's connect()/close() pairs
			# (inside find()/find_and_lock_by_id/etc.) become no-ops. This keeps the
			# "for update" lock and the update in a single atomic transaction.
			storage = topic_data_service.get_storage()
			await storage.begin_managed_async()
			committed = False
			try:
				data = await topic_data_service.find(criteria=[statement])
				count = len(data)
				if count == 0:
					if allow_insert:
						# data not found, do insertion
						await self.do_insert(
							variables, new_pipeline, action_monitor_log, principal_service, topic_data_service, False)
					else:
						raise PipelineKernelException(
							f'Data not found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
				elif count != 1:
					raise PipelineKernelException(
						f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
				else:
					# do lock loaded data by id, then it cannot be updated by any other
					# threads/processes/nodes until the transaction commits.
					_, data_id = topic_data_service.get_data_entity_helper().find_data_id(data[0])
					locked_data = await topic_data_service.find_and_lock_by_id(data_id)
					if locked_data is None:
						raise PipelineKernelException(
							f'Data not found on doing "for update" lock when last try to update, '
							f'{self.on_topic_message()}, by [{[statement.to_dict()]}].')
					updated_count = await self.do_update_with_lock(
						locked_data, variables, new_pipeline, action_monitor_log, principal_service, topic_data_service)
					if updated_count == 0:
						raise PipelineKernelException(
							f'Data not found on doing last try to update, '
							f'{self.on_topic_message()}, by [{[statement.to_dict()]}].')
				await storage.end_managed(True)
				committed = True
			finally:
				if not committed:
					await storage.end_managed(False)

		async def work(times: int, is_insert_allowed: bool, cached_data: Optional[Dict[str, Any]] = None) -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			# Wrap find + insert/update in a managed transaction so they run on one
			# connection with no await-checkpoints that let a concurrent trigger's
			# find/insert interleave (the sync version is naturally serialized because
			# its start() has no await checkpoints; the async version needs the tx guard).
			storage = topic_data_service.get_storage()
			await storage.begin_managed_async()
			committed = False
			try:
				if cached_data is not None:
					# retry by id: read latest version via primary key, skip full condition query
					_, data_id = topic_data_service.get_data_entity_helper().find_data_id(cached_data)
					data = [await topic_data_service.find_data_by_id(data_id)] if data_id is not None else []
					data = [d for d in data if d is not None]
				else:
					# first attempt: full condition query
					statement = self.parsedFindBy.run(variables, principal_service)
					action_monitor_log.findBy = statement.to_dict()
					data = await topic_data_service.find(criteria=[statement])
				count = len(data)
				if count == 0:
					if is_insert_allowed:
						# data not found, do insertion
						success_on_insert = await self.do_insert(
							variables, new_pipeline, action_monitor_log, principal_service, topic_data_service, True)
						if not success_on_insert:
							await storage.end_managed(True)
							committed = True
							await work(times, False)
						else:
							await storage.end_managed(True)
							committed = True
					else:
						# insertion is not allowed
						raise PipelineKernelException(
							f'Data not found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
				elif count != 1:
					raise PipelineKernelException(
						f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
				else:
					# found one matched, do update
					updated_count = await self.do_update(
						data[0], variables, new_pipeline, action_monitor_log, principal_service, topic_data_service)
					await storage.end_managed(True)
					committed = True
					if updated_count == 0:
						if not topic_data_service.get_data_entity_helper().is_versioned():
							raise PipelineKernelException(
								f'Data not found on do update, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
						elif ask_pipeline_update_retry() and times < ask_pipeline_update_retry_times():
							# adaptive backoff: 0ms on first retry, 5ms on second, 10ms on third
							if times == 0:
								interval = 0
							elif times == 1:
								interval = 5
							else:
								interval = 10
							if interval > 0:
								jitter = max(1, int(interval * 0.3))
								interval = interval + randrange(-jitter, jitter + 1)
								interval = max(1, interval)
								await asyncio.sleep(interval / 1000)
							await work(times + 1, is_insert_allowed, data[0])
						elif ask_pipeline_update_retry() and ask_pipeline_update_retry_force():
							await last_try()
						else:
							raise PipelineKernelException(
								f'Data not found on do update, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			finally:
				if not committed:
					await storage.end_managed(False)

		# safe_run expects a zero-arg callable; work() is an async def, so wrap the
		# invocation in a lambda that returns the coroutine. safe_run will await it.
		def create_worker() -> Callable[[], Any]:
			# retry times starts from 0
			return lambda: work(0, allow_insert)
		return await self.safe_run(action_monitor_log, create_worker())

	async def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> bool:
		return await self.do_insert_or_merge(variables, new_pipeline, action_monitor_log, storages, principal_service, True)


class AsyncCompiledMergeRowAction(AsyncCompiledInsertOrMergeRowAction):
	async def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> bool:
		return await self.do_insert_or_merge(variables, new_pipeline, action_monitor_log, storages, principal_service, False)


class AsyncCompiledWriteFactorAction(AsyncCompiledInsertOrMergeRowAction):
	async def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> bool:
		return await self.do_insert_or_merge(variables, new_pipeline, action_monitor_log, storages, principal_service, False)


# noinspection PyAbstractClass
class AsyncCompiledDeleteTopicAction(AsyncCompiledFindByAction):
	def parse_action(self, action: DeleteTopicAction, principal_service: PrincipalService) -> None:
		self.parse_topic_schema(action, principal_service)
		self.parse_find_by(action, principal_service)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorDeleteAction:
		return MonitorDeleteAction(**common, by=None, value=None)


class AsyncCompiledDeleteRowAction(AsyncCompiledDeleteTopicAction):
	async def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorDeleteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = await topic_data_service.find(criteria=[statement])
			count = len(data)
			if count == 0:
				raise PipelineKernelException(
					f'Data not found before do deletion, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			elif count != 1:
				raise PipelineKernelException(
					f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			else:
				deleted_count, criteria = await topic_data_service.delete_by_id_and_version(data[0])
				if deleted_count == 0:
					raise PipelineKernelException(
						f'Data not found on do deletion, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
				else:
					# new pipeline
					has_id, id_ = topic_data_service.get_data_entity_helper().find_data_id(data[0])
					new_pipeline(self.schema, TopicTrigger(
						previous=data[0],
						current=None,
						triggerType=PipelineTriggerType.DELETE,
						internalDataId=id_
					))
			action_monitor_log.deleteCount = 1
			action_monitor_log.touched = {'data': data}

		return await self.safe_run(action_monitor_log, work)


class AsyncCompiledDeleteRowsAction(AsyncCompiledDeleteTopicAction):
	async def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorDeleteAction, storages: AsyncTopicStorages,
			principal_service: PrincipalService) -> bool:
		async def work() -> None:
			topic_data_service = await self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = await topic_data_service.find(criteria=[statement])
			touched = []
			# no transaction here, stop on first count mismatched or exception raised
			try:
				for row in data:
					deleted_count, criteria = await topic_data_service.delete_by_id_and_version(row)
					if deleted_count == 0:
						raise PipelineKernelException(
							f'Data not found on do deletion, {self.on_topic_message()}, '
							f'by [{[statement.to_dict()]}], Bulk deletion stopped.')
					else:
						touched.append(row)
						# new pipeline
						has_id, id_ = topic_data_service.get_data_entity_helper().find_data_id(row)
						new_pipeline(self.schema, TopicTrigger(
							previous=row,
							current=None,
							triggerType=PipelineTriggerType.DELETE,
							internalDataId=id_
						))
			finally:
				# log done information
				action_monitor_log.deleteCount = len(touched)
				action_monitor_log.touched = {'data': touched}

		return await self.safe_run(action_monitor_log, work)


def compile_async_action(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: PipelineAction,
		principal_service: PrincipalService
) -> AsyncCompiledAction:
	action_type = action.type
	if action_type == SystemActionType.ALARM:
		return AsyncCompiledAlarmAction(pipeline, stage, unit, action, principal_service)
	elif action_type == SystemActionType.COPY_TO_MEMORY:
		return AsyncCompiledCopyToMemoryAction(pipeline, stage, unit, action, principal_service)
	elif action_type == SystemActionType.WRITE_TO_EXTERNAL:
		return AsyncCompiledWriteToExternalAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_ROW:
		return AsyncCompiledReadRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_ROWS:
		return AsyncCompiledReadRowsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_FACTOR:
		return AsyncCompiledReadFactorAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_FACTORS:
		return AsyncCompiledReadFactorsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.EXISTS:
		return AsyncCompiledExistsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.INSERT_ROW:
		return AsyncCompiledInsertRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.INSERT_OR_MERGE_ROW:
		return AsyncCompiledInsertOrMergeRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.MERGE_ROW:
		return AsyncCompiledMergeRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.WRITE_FACTOR:
		return AsyncCompiledWriteFactorAction(pipeline, stage, unit, action, principal_service)
	elif action_type == DeleteTopicActionType.DELETE_ROW:
		return AsyncCompiledDeleteRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == DeleteTopicActionType.DELETE_ROWS:
		return AsyncCompiledDeleteRowsAction(pipeline, stage, unit, action, principal_service)
	else:
		raise PipelineKernelException(f'Action type[{action_type}] is not supported.')


def compile_async_actions(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
		principal_service: PrincipalService) -> List[AsyncCompiledAction]:
	actions = unit.do
	if actions is None or len(actions) == 0:
		return []
	else:
		return ArrayHelper(actions) \
			.map(lambda x: compile_async_action(pipeline, stage, unit, x, principal_service)).to_list()
