from abc import abstractmethod
from logging import getLogger
from traceback import format_exc
from typing import Any, Callable, Dict, List, Optional, Union

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import AlarmAction, AlarmActionSeverity, CopyToMemoryAction, DeleteTopicAction, \
	DeleteTopicActionType, FindBy, FromTopic, is_raw_topic, MappingFactor, MappingRow, Pipeline, PipelineAction, \
	PipelineStage, \
	PipelineTriggerType, PipelineUnit, \
	ReadTopicAction, \
	ReadTopicActionType, SystemActionType, Topic, ToTopic, WriteFactorAction, WriteToExternalAction, WriteTopicAction, \
	WriteTopicActionType
from watchmen_model.common import ConstantParameter, ParameterKind
from watchmen_model.reactor import MonitorAlarmAction, MonitorCopyToMemoryAction, MonitorDeleteAction, \
	MonitorLogAction, MonitorLogStatus, MonitorLogUnit, MonitorReadAction, MonitorWriteAction, \
	MonitorWriteToExternalAction
from watchmen_reactor.common import ReactorException
from watchmen_reactor.external_writer import ask_external_writer_creator, CreateExternalWriter, ExternalWriterParams
from watchmen_reactor.meta import ExternalWriterService, TopicService
from watchmen_reactor.pipeline_schema import TopicStorages
from watchmen_reactor.storage import RawTopicDataEntityHelper, RawTopicDataService, RegularTopicDataEntityHelper, \
	RegularTopicDataService, \
	TopicDataEntityHelper, \
	TopicDataService, TopicTrigger
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_utilities import ArrayHelper, is_blank
from .runtime import CreateQueuePipeline, now, parse_action_defined_as, parse_condition_for_storage, \
	parse_mapping_for_storage, parse_parameter_in_memory, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	ParsedMemoryParameter, \
	ParsedStorageCondition, ParsedStorageMapping, PipelineVariables, PrerequisiteDefinedAs, PrerequisiteTest, spent_ms
from ..cache import CacheService

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_external_writer_service(principal_service: PrincipalService) -> ExternalWriterService:
	return ExternalWriterService(principal_service)


def find_topic_schema_for_action(action: Union[ToTopic, FromTopic], principal_service: PrincipalService) -> TopicSchema:
	topic_id = action.topicId
	if is_blank(topic_id):
		raise ReactorException(f'Topic not declared in delete action[{action.dict()}].')
	topic_service = get_topic_service(principal_service)
	topic: Optional[Topic] = topic_service.find_by_id(topic_id)
	if topic is None:
		raise ReactorException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise ReactorException(f'Topic schema[id={topic_id}] not found.')
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
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
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
					action_monitor_log.touched = value
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
			raise ReactorException(f'Variable not declared in copy to variable action.')
		self.variableName = action.variableName
		self.parsedSource = parse_parameter_in_memory(action.source, principal_service)

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorCopyToMemoryAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		def work() -> None:
			value = self.parsedSource.value(variables, principal_service)
			action_monitor_log.touched = value
			variables.put(self.variableName, value)

		return self.safe_run(action_monitor_log, work)

	def create_action_log(self, common: Dict[str, Any]) -> MonitorCopyToMemoryAction:
		return MonitorCopyToMemoryAction(**common, value=None)


def create_external_write(
		create: CreateExternalWriter, event_code: Optional[str], pat: Optional[str], url: Optional[str]
) -> Callable[[PipelineVariables, PrincipalService], None]:
	# noinspection PyUnusedLocal
	def write(variables: PipelineVariables, principal_service: PrincipalService) -> None:
		cloned = variables.clone_all()
		create().run(ExternalWriterParams(
			pat=pat,
			url=url,
			event_code=event_code,
			current_data=cloned.currentData,
			previous_data=cloned.previousData,
			variables=cloned.variables
		))

	return write


class CompiledWriteToExternalAction(CompiledAction):
	eventCode: Optional[str] = None
	write: Optional[Callable[[PipelineVariables, PrincipalService], None]] = None

	def parse_action(self, action: WriteToExternalAction, principal_service: PrincipalService) -> None:
		writer_id = action.externalWriterId
		if is_blank(writer_id):
			raise ReactorException(f'External writer not declared.')
		external_writer = get_external_writer_service(principal_service).find_by_id(writer_id)
		if external_writer is None:
			raise ReactorException(f'External writer[id={writer_id}] not found.')
		code = external_writer.code
		create = ask_external_writer_creator(code)
		if create is None:
			raise ReactorException(f'Cannot find external writer[code={code}] creator.')
		self.write = create_external_write(create, action.eventCode, external_writer.pat, external_writer.url)

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
	parsedFindBy: Optional[ParsedStorageCondition] = None
	parsedMapping: Optional[ParsedStorageMapping] = None

	def parse_topic_schema(self, action: Union[ToTopic, FromTopic], principal_service: PrincipalService) -> None:
		self.schema = find_topic_schema_for_action(action, principal_service)

	def parse_find_by(self, action: FindBy, principal_service: PrincipalService) -> None:
		self.parsedFindBy = parse_condition_for_storage(action.by, principal_service)

	def parse_mapping_factors(
			self, action: Union[ToTopic, FromTopic], factors: Optional[List[MappingFactor]],
			principal_service: PrincipalService) -> None:
		if self.schema is None:
			self.parse_topic_schema(action, principal_service)
		self.parsedMapping = parse_mapping_for_storage(self.schema, factors, principal_service)

	def parse_mapping_row(self, action: MappingRow, principal_service: PrincipalService) -> None:
		if not isinstance(action, ToTopic) and not isinstance(action, FromTopic):
			raise ReactorException(f'Topic not declared in action[{action.dict()}].')
		self.parse_mapping_factors(action, action.factors, principal_service)

	def get_topic(self) -> Optional[Topic]:
		return self.schema.get_topic() if self.schema is not None else None

	def on_topic_message(self) -> str:
		topic = self.get_topic()
		return f'on topic[id={topic.topicId}, name={topic.name}]' if topic is not None else ''

	# noinspection PyMethodMayBeStatic,DuplicatedCode
	def ask_topic_data_entity_helper(self, schema: TopicSchema) -> TopicDataEntityHelper:
		"""
		ask topic data entity helper, from cache first
		"""
		data_entity_helper = CacheService.topic().get_entity_helper(schema.get_topic().topicId)
		if data_entity_helper is None:
			if is_raw_topic(schema.get_topic()):
				data_entity_helper = RawTopicDataEntityHelper(schema)
			else:
				data_entity_helper = RegularTopicDataEntityHelper(schema)
			CacheService.topic().put_entity_helper(data_entity_helper)
		return data_entity_helper

	def ask_topic_data_service(
			self, schema: TopicSchema, storages: TopicStorages,
			principal_service: PrincipalService) -> TopicDataService:
		"""
		ask topic data service
		"""
		data_entity_helper = self.ask_topic_data_entity_helper(schema)
		storage = storages.ask_topic_storage(schema)
		storage.register_topic(schema.get_topic())
		if is_raw_topic(schema.get_topic()):
			return RawTopicDataService(schema, data_entity_helper, storage, principal_service)
		else:
			return RegularTopicDataService(schema, data_entity_helper, storage, principal_service)


class CompiledReadTopicAction(CompiledStorageAction):
	def parse_action(self, action: ReadTopicAction, principal_service: PrincipalService) -> None:
		# TODO parse read topic action
		pass

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		# TODO run read topic action
		pass

	def create_action_log(self, common: Dict[str, Any]) -> MonitorReadAction:
		return MonitorReadAction(**common, by=None, value=None)


class CompiledReadRowAction(CompiledReadTopicAction):
	pass


class CompiledReadRowsAction(CompiledReadTopicAction):
	pass


class CompiledReadFactorAction(CompiledReadTopicAction):
	pass


class CompiledReadFactorsAction(CompiledReadTopicAction):
	pass


class CompiledExistsAction(CompiledReadTopicAction):
	pass


class CompiledWriteTopicAction(CompiledStorageAction):
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


class CompiledInsertRowAction(CompiledWriteTopicAction):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorWriteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(self.schema, storages, principal_service)
			data = self.parsedMapping.run(variables, principal_service)
			self.schema.encrypt(data)
			data = topic_data_service.insert(data)
			action_monitor_log.insertCount = 1
			action_monitor_log.touched = [data]
			# new pipeline
			has_id, id_ = topic_data_service.get_data_entity_helper().find_data_id(data)
			new_pipeline(self.schema, TopicTrigger(
				previous=None,
				current=data,
				triggerType=PipelineTriggerType.INSERT,
				internalDataId=id_
			))

		return self.safe_run(action_monitor_log, work)


class CompiledInsertOrMergeRowAction(CompiledWriteTopicAction):
	pass


class CompiledMergeRowAction(CompiledWriteTopicAction):
	pass


class CompiledWriteFactorAction(CompiledWriteTopicAction):
	pass


# noinspection PyAbstractClass
class CompiledDeleteTopicAction(CompiledStorageAction):
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
			topic_data_service = self.ask_topic_data_service(
				schema=self.schema, storages=storages, principal_service=principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
			count = len(data)
			if count == 0:
				raise ReactorException('Data not found before do deletion.')
			elif count != 1:
				raise ReactorException(f'Too many data found, expect one but {count} found.')
			else:
				delete_count, criteria = topic_data_service.delete_by_id_and_version(data[0])
				if delete_count == 0:
					raise ReactorException(
						f'Data not found on do deletion, {self.on_topic_message()}, by [{criteria}].')
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
			action_monitor_log.touched = data

		return self.safe_run(action_monitor_log, work)


class CompiledDeleteRowsAction(CompiledDeleteTopicAction):
	def do_run(
			self, variables: PipelineVariables, new_pipeline: CreateQueuePipeline,
			action_monitor_log: MonitorDeleteAction, storages: TopicStorages,
			principal_service: PrincipalService) -> bool:
		def work() -> None:
			topic_data_service = self.ask_topic_data_service(
				schema=self.schema, storages=storages, principal_service=principal_service)
			statement = self.parsedFindBy.run(variables, principal_service)
			action_monitor_log.findBy = statement.to_dict()
			data = topic_data_service.find(criteria=[statement])
			touched = []
			# no transaction here, stop on first count mismatched or exception raised
			try:
				for row in data:
					delete_count, criteria = topic_data_service.delete_by_id_and_version(row)
					if delete_count == 0:
						raise ReactorException(
							f'Data not found on do deletion, {self.on_topic_message()}, by [{criteria}], '
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
				action_monitor_log.touched = touched

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
		raise ReactorException(f'Action type[{action_type}] is not supported.')


def compile_actions(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
		principal_service: PrincipalService) -> List[CompiledAction]:
	actions = unit.do
	if actions is None or len(actions) == 0:
		return []
	else:
		return ArrayHelper(actions) \
			.map(lambda x: compile_action(pipeline, stage, unit, x, principal_service)).to_list()
