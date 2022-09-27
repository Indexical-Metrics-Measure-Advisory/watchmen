from abc import abstractmethod
from copy import deepcopy
from logging import getLogger
from random import randrange
from traceback import format_exc
from typing import Any, Callable, Dict, List, Optional, Union

from time import sleep

from watchmen_auth import PrincipalService
from watchmen_data_kernel.external_writer import ask_external_writer_creator, ExternalWriter, \
	ExternalWriterParams
from watchmen_data_kernel.meta import ExternalWriterService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service
from watchmen_data_kernel.storage import TopicDataService, TopicTrigger
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
from watchmen_pipeline_kernel.pipeline_schema_interface import CreateQueuePipeline, TopicStorages
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


class CompiledAction:
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

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		action_monitor_log = self.create_action_log(self.create_common_action_log())
		unit_monitor_log.actions.append(action_monitor_log)
		return self.do_run(
			variables=variables, new_pipeline=new_pipeline, action_monitor_log=action_monitor_log,
			storages=storages, principal_service=principal_service)

	# noinspection PyMethodMayBeStatic
	def safe_run(self, action_monitor_log: MonitorLogAction, work: Callable[[], None]) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		# noinspection PyBroadException
		try:
			work()
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
	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
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


class CompiledAlarmAction(CompiledAction):
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

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorAlarmAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
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
					logger.error(f'[PIPELINE] [ALARM] [{self.severity.upper()}] {value}')

				return self.safe_run(action_monitor_log, work)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			action_monitor_log.status = MonitorLogStatus.ERROR
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			action_monitor_log.error = format_exc()
			return False

	def create_action_log(self, common: Dict[str, Any]) -> MonitorAlarmAction:
		return MonitorAlarmAction(**common, prerequisite=True, prerequisiteDefinedAs=self.prerequisiteDefinedAs())


class CompiledCopyToMemoryAction(CompiledAction):
	variableName: Optional[str] = None
	parsedSource: Optional[ParsedMemoryParameter] = None

	def parse_action(self, action: CopyToMemoryAction, principal_service: PrincipalService) -> None:
		if is_blank(action.variableName):
			raise PipelineKernelException(f'Variable not declared in copy to variable action.')
		self.variableName = action.variableName
		self.parsedSource = parse_parameter_in_memory(action.source, principal_service)

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorCopyToMemoryAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
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

		return self.safe_run(action_monitor_log, work)

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


class CompiledWriteToExternalAction(CompiledAction):
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

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorWriteToExternalAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		return self.safe_run(action_monitor_log, lambda: self.write(variables, principal_service))

	def create_action_log(self, common: Dict[str, Any]) -> MonitorWriteToExternalAction:
		return MonitorWriteToExternalAction(**common, value=None)


# noinspection PyAbstractClass
class CompiledStorageAction(CompiledAction):
	schema: Optional[TopicSchema] = None

	def parse_topic_schema(self, action: Union[ToTopic, FromTopic], principal_service: PrincipalService) -> None:
		self.schema = find_topic_schema_for_action(action, principal_service)

	def get_topic(self) -> Optional[Topic]:
		return self.schema.get_topic() if self.schema is not None else None

	def on_topic_message(self) -> str:
		topic = self.get_topic()
		return f'on topic[id={topic.topicId}, name={topic.name}]' if topic is not None else ''

	# noinspection PyMethodMayBeStatic
	def ask_topic_data_service(
			self, schema: TopicSchema, storages: TopicStorages,
			principal_service: PrincipalService) -> TopicDataService:
		"""
		ask topic data service
		"""
		storage = storages.ask_topic_storage(schema)
		return ask_topic_data_service(schema, storage, principal_service)


# noinspection PyAbstractClass
class CompiledFindByAction(CompiledStorageAction):
	parsedFindBy: Optional[ParsedStorageCondition] = None

	def parse_find_by(self, action: FindBy, principal_service: PrincipalService) -> None:
		if self.schema is None and isinstance(action, (FromTopic, ToTopic)):
			self.parse_topic_schema(action, principal_service)
		self.parsedFindBy = parse_condition_for_storage(action.by, [self.schema], principal_service, True)


# noinspection PyAbstractClass
class CompiledReadTopicAction(CompiledFindByAction):
	variableName: Optional[str] = None

	def parse_action(self, action: ReadTopicAction, principal_service: PrincipalService) -> None:
		if is_blank(action.variableName):
			raise PipelineKernelException(f'Variable not declared in read action.')
		self.variableName = action.variableName
		self.parse_topic_schema(action, principal_service)
		self.parse_find_by(action, principal_service)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorReadAction:
		return MonitorReadAction(**common, by=None, value=None)


class CompiledReadRowAction(CompiledReadTopicAction):
	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
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

		return self.safe_run(action_monitor_log, work)


class CompiledReadRowsAction(CompiledReadTopicAction):
	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
			if ask_decrypt_factor_value():
				data = ArrayHelper(data).map(lambda x: self.schema.decrypt(x, principal_service)).to_list()
			variables.put(self.variableName, data)
			action_monitor_log.touched = {'data': data}

		return self.safe_run(action_monitor_log, work)


# noinspection PyAbstractClass
class CompiledReadTopicFactorAction(CompiledReadTopicAction):
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


class CompiledReadFactorAction(CompiledReadTopicFactorAction):
	aggregateArithmetic: Optional[AggregateArithmetic] = None

	def parse_action(
			self, action: ReadFactorAction, principal_service: PrincipalService) -> None:
		super().parse_action(action, principal_service)
		self.aggregateArithmetic = AggregateArithmetic.NONE if action.arithmetic is None else action.arithmetic

	def build_straight_column(self, topic_data_service: TopicDataService) -> EntityStraightColumn:
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

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find_straight_values(
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

		return self.safe_run(action_monitor_log, work)


class CompiledReadFactorsAction(CompiledReadTopicFactorAction):
	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			column_name = topic_data_service.get_data_entity_helper().get_column_name(self.factor.name)
			data = topic_data_service.find_distinct_values(criteria=[statement], column_names=[column_name])
			factor_values = ArrayHelper(data).map(lambda x: x.get(self.factor.name)).to_list()
			if ask_decrypt_factor_value():
				factor_values = ArrayHelper(data) \
					.map(lambda x: self.schema.decrypt({self.factor.name: x}, principal_service)) \
					.map(lambda x: x.get(self.factor.name)) \
					.to_list()
			variables.put(self.variableName, factor_values)
			action_monitor_log.touched = {'data': factor_values}

		return self.safe_run(action_monitor_log, work)


class CompiledExistsAction(CompiledReadTopicAction):
	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorReadAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			existing = topic_data_service.exists(criteria=[statement])
			variables.put(self.variableName, existing)

		return self.safe_run(action_monitor_log, work)


# noinspection PyAbstractClass
class CompiledWriteTopicAction(CompiledFindByAction):
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
class CompiledInsertion(CompiledWriteTopicAction):
	def do_insert(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction,
			principal_service: PrincipalService, topic_data_service: TopicDataService,
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
			data = topic_data_service.insert(data)
		except Exception as e:
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
class CompiledUpdate(CompiledWriteTopicAction):
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
			self, topic_data_service: TopicDataService, new_pipeline: CreateQueuePipeline,
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

	def do_update(
			self, original_data: Dict[str, Any], variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction,
			principal_service: PrincipalService, topic_data_service: TopicDataService) -> int:
		updated_data = self.redress_update_data(original_data, variables, principal_service)
		updated_count, criteria = topic_data_service.update_by_id_and_version(updated_data)
		return self.post_update(
			topic_data_service, new_pipeline, original_data, updated_data, action_monitor_log, updated_count, criteria)

	def do_update_with_lock(
			self, original_data: Dict[str, Any], variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction,
			principal_service: PrincipalService, topic_data_service: TopicDataService) -> int:
		updated_data = self.redress_update_data(original_data, variables, principal_service)
		updated_count, criteria = topic_data_service.update_with_lock_by_id(updated_data)
		return self.post_update(
			topic_data_service, new_pipeline, original_data, updated_data, action_monitor_log, updated_count, criteria)


class CompiledInsertRowAction(CompiledInsertion):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			self.do_insert(variables, new_pipeline, action_monitor_log, principal_service, topic_data_service, False)

		return self.safe_run(action_monitor_log, work)


class CompiledInsertOrMergeRowAction(CompiledInsertion, CompiledUpdate):
	def do_insert_or_merge(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: TopicStorages,
			principal_service: PrincipalService,
			allow_insert: bool) -> bool:
		def last_try() -> None:
			# force lock and update, the final try after all retries by optimistic lock are failed
			# still use the regular process
			# find data by given findBy, do insertion when data not found and insertion is allowed, blablabla...
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			# use transaction here
			topic_data_service.get_storage().begin()
			data = topic_data_service.find(criteria=[statement])
			count = len(data)
			if count == 0:
				if allow_insert:
					# data not found, do insertion
					self.do_insert(
						variables, new_pipeline, action_monitor_log, principal_service, topic_data_service, False)
				else:
					# insertion is not allowed
					raise PipelineKernelException(f'Data not found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			elif count != 1:
				raise PipelineKernelException(
					f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			else:
				# after several times failures, it is the last try.
				# do lock loaded data by id, then it cannot be updated by any other threads, processes or nodes.
				# Of consideration of performance, we do need a TX lock here,
				# but in some RDS(eg. MySQL), for update lock must through id criteria, otherwise leads TM lock.
				# still, data might be deleted before it is locked, raise exception on this situation.
				# or, lock it successfully, do update and commit transaction.
				# when data row was locked, update requests from any other threads, processes or nodes
				# are waiting for the transaction commit or rollback.
				topic_data_service.get_storage().begin()
				try:
					# data was loaded from storage, of course it has an id
					_, data_id = topic_data_service.get_data_entity_helper().find_data_id(data[0])
					locked_data = topic_data_service.find_and_lock_by_id(data_id)
					if locked_data is None:
						raise PipelineKernelException(
							f'Data not found on doing "for update" lock when last try to update, '
							f'{self.on_topic_message()}, by [{[statement.to_dict()]}].')
					# found one matched, do update
					updated_count = self.do_update_with_lock(
						data[0], variables, new_pipeline, action_monitor_log, principal_service, topic_data_service)
					if updated_count == 0:
						raise PipelineKernelException(
							f'Data not found on doing last try to update, '
							f'{self.on_topic_message()}, by [{[statement.to_dict()]}].')
					topic_data_service.get_storage().commit_and_close()
				except Exception as e:
					topic_data_service.get_storage().rollback_and_close()
					raise e

		def work(times: int, is_insert_allowed: bool) -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
			count = len(data)
			if count == 0:
				if is_insert_allowed:
					# data not found, do insertion
					success_on_insert = self.do_insert(
						variables, new_pipeline, action_monitor_log, principal_service, topic_data_service, True)
					if not success_on_insert:
						work(times, False)
				else:
					# insertion is not allowed
					raise PipelineKernelException(f'Data not found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			elif count != 1:
				raise PipelineKernelException(
					f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			else:
				# found one matched, do update
				updated_count = self.do_update(
					data[0], variables, new_pipeline, action_monitor_log, principal_service, topic_data_service)
				if updated_count == 0:
					if not topic_data_service.get_data_entity_helper().is_versioned():
						raise PipelineKernelException(
							f'Data not found on do update, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
					elif ask_pipeline_update_retry() and times < ask_pipeline_update_retry_times():
						# retry interval is based on given settings and random plus 1 - 20 ms
						# since there are 2 situations will lead update nothing
						# 1. data is deleted, then in next round, will do insertion
						# 2. data is updated by another thread, process or node, typically it is caused by version increment.
						# for case #2, most of all are led by to aggregate data by a data list.
						# then random the interval might be helpful to distribute the writing evenly.
						interval = ask_pipeline_update_retry_interval()
						interval = interval + randrange(1, 20)
						sleep(interval / 1000)
						# example: try update on [0, 1, 2] when retry times is 3
						work(times + 1, is_insert_allowed)
					elif ask_pipeline_update_retry() and ask_pipeline_update_retry_force():
						last_try()
					else:
						raise PipelineKernelException(
							f'Data not found on do update, {self.on_topic_message()}, by [{[statement.to_dict()]}].')

		def create_worker() -> Callable[[], None]:
			# retry times starts from 0
			return lambda: work(0, allow_insert)

		return self.safe_run(action_monitor_log, create_worker())

	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		return self.do_insert_or_merge(variables, new_pipeline, action_monitor_log, storages, principal_service, True)


class CompiledMergeRowAction(CompiledInsertOrMergeRowAction):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		return self.do_insert_or_merge(variables, new_pipeline, action_monitor_log, storages, principal_service, False)


class CompiledWriteFactorAction(CompiledInsertOrMergeRowAction):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		return self.do_insert_or_merge(variables, new_pipeline, action_monitor_log, storages, principal_service, False)


# noinspection PyAbstractClass
class CompiledDeleteTopicAction(CompiledFindByAction):
	def parse_action(self, action: DeleteTopicAction, principal_service: PrincipalService) -> None:
		self.parse_topic_schema(action, principal_service)
		self.parse_find_by(action, principal_service)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorDeleteAction:
		return MonitorDeleteAction(**common, by=None, value=None)


class CompiledDeleteRowAction(CompiledDeleteTopicAction):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorDeleteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
			count = len(data)
			if count == 0:
				raise PipelineKernelException(
					f'Data not found before do deletion, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			elif count != 1:
				raise PipelineKernelException(
					f'Too many data[count={count}] found, {self.on_topic_message()}, by [{[statement.to_dict()]}].')
			else:
				deleted_count, criteria = topic_data_service.delete_by_id_and_version(data[0])
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

		return self.safe_run(action_monitor_log, work)


class CompiledDeleteRowsAction(CompiledDeleteTopicAction):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorDeleteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
			touched = []
			# no transaction here, stop on first count mismatched or exception raised
			try:
				for row in data:
					deleted_count, criteria = topic_data_service.delete_by_id_and_version(row)
					if deleted_count == 0:
						raise PipelineKernelException(
							f'Data not found on do deletion, {self.on_topic_message()}, by [{[statement.to_dict()]}], '
							f'Bulk deletion stopped.')
					else:
						touched.append(row)
						# new pipeline
						has_id, id_ = topic_data_service.get_data_entity_helper().find_data_id(data[0])
						new_pipeline(self.schema, TopicTrigger(
							previous=data[0],
							current=None,
							triggerType=PipelineTriggerType.DELETE,
							internalDataId=id_
						))
			finally:
				# log done information
				action_monitor_log.deleteCount = len(touched)
				action_monitor_log.touched = {'data': touched}

		return self.safe_run(action_monitor_log, work)


def compile_action(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: PipelineAction,
		principal_service: PrincipalService
) -> CompiledAction:
	action_type = action.type
	if action_type == SystemActionType.ALARM:
		return CompiledAlarmAction(pipeline, stage, unit, action, principal_service)
	elif action_type == SystemActionType.COPY_TO_MEMORY:
		return CompiledCopyToMemoryAction(pipeline, stage, unit, action, principal_service)
	elif action_type == SystemActionType.WRITE_TO_EXTERNAL:
		return CompiledWriteToExternalAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_ROW:
		return CompiledReadRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_ROWS:
		return CompiledReadRowsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_FACTOR:
		return CompiledReadFactorAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_FACTORS:
		return CompiledReadFactorsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.EXISTS:
		return CompiledExistsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.INSERT_ROW:
		return CompiledInsertRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.INSERT_OR_MERGE_ROW:
		return CompiledInsertOrMergeRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.MERGE_ROW:
		return CompiledMergeRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.WRITE_FACTOR:
		return CompiledWriteFactorAction(pipeline, stage, unit, action, principal_service)
	elif action_type == DeleteTopicActionType.DELETE_ROW:
		return CompiledDeleteRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == DeleteTopicActionType.DELETE_ROWS:
		return CompiledDeleteRowsAction(pipeline, stage, unit, action, principal_service)
	else:
		raise PipelineKernelException(f'Action type[{action_type}] is not supported.')


def compile_actions(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
		principal_service: PrincipalService) -> List[CompiledAction]:
	actions = unit.do
	if actions is None or len(actions) == 0:
		return []
	else:
		return ArrayHelper(actions) \
			.map(lambda x: compile_action(pipeline, stage, unit, x, principal_service)).to_list()
