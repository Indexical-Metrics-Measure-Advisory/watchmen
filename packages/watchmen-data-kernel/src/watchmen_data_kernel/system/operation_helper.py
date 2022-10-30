from pydantic import BaseModel
from enum import Enum
from typing import List, Tuple
from io import BytesIO, StringIO
import zipfile

from watchmen_data_kernel.meta import DataSourceService

from watchmen_meta.system import RecordOperationService
from watchmen_meta.admin import TopicService

from watchmen_model.system import Operation, DataSourceType
from watchmen_model.admin import Topic

from watchmen_storage_rds import ScriptBuilder

from watchmen_utilities import ArrayHelper
from .change_log_helper import ChangelogXml


class TupleType(str, Enum):
	TOPICS = "topics"
	PIPELINES = "pipelines"
	SPACES = "spaces"
	SUBJECTS = "subjects"
	REPORTS = "reports"


class ScriptFile(BaseModel):
	name: str
	content: str
	datasource_type: str


class MetaScriptFile(ScriptFile):
	pass


class DataScriptFile(ScriptFile):
	datasource_id: str


def get_topic_service(operation_service: RecordOperationService) -> TopicService:
	return TopicService(operation_service.storage, operation_service.snowflakeGenerator,
	                    operation_service.principalService)


def build_zip(files: List[ScriptFile], change_log_file: Tuple[str, str]) -> BytesIO:
	_io = BytesIO()
	zf = zipfile.ZipFile(_io, 'w', zipfile.ZIP_DEFLATED)
	for file in files:
		zf.writestr(file.name, file.content)
	zf.writestr(change_log_file[0], change_log_file[1])
	zf.close()
	return _io


def generate_change_log_file(version: str, files: List[ScriptFile]) -> Tuple[str, str]:
	change_log = ChangelogXml(version)
	for file in files:
		change_log.build_change_file(file.name, file.datasource_type)
	return change_log.file_name, change_log.get_change_log_content()


def build_file_name(sequence: int, file_name: str) -> str:
	prefix = ""
	if sequence < 10:
		prefix = f"000{sequence}"
	if 10 <= sequence < 100:
		prefix = f"00{sequence}"
	if 100 <= sequence < 1000:
		prefix = f"0{sequence}"
	if sequence > 1000:
		prefix = f"{sequence}"
	return f"{prefix}-{file_name}"


def script_builder_factory(type: DataSourceType) -> ScriptBuilder:
	if type == DataSourceType.MYSQL:
		from watchmen_storage_mysql import ScriptBuilderMySQL
		return ScriptBuilderMySQL()
	if type == DataSourceType.MSSQL:
		from watchmen_storage_mssql import ScriptBuilderMSSQL
		return ScriptBuilderMSSQL()
	if type == DataSourceType.ORACLE:
		from watchmen_storage_oracle import ScriptBuilderOracle
		return ScriptBuilderOracle()
	if type == DataSourceType.POSTGRESQL:
		from watchmen_storage_postgresql import ScriptBuilderPostgreSQL
		return ScriptBuilderPostgreSQL()


class OperationParser:
	
	def __init__(self, operation_service: RecordOperationService,
	             meta_data_source_type: DataSourceType,
	             current_version: str):
		self.operation_service = operation_service
		self.meta_datasource_type = meta_data_source_type
		self.meta_script_builder = script_builder_factory(meta_data_source_type)
		self.version = current_version
		self.meta_files: List[ScriptFile] = []
		self.data_files: List[ScriptFile] = []
	
	def get_record_ids_with_current_version(self, tuple_type: TupleType) -> List[str]:
		record_rows = self.operation_service.get_record_ids(self.version, tuple_type)
		record_ids = ArrayHelper(record_rows).map(lambda x: x.get("record_id")).to_list()
		return record_ids
	
	def parse_all(self):
		return self.parse(TupleType.TOPICS)\
			.parse(TupleType.PIPELINES)\
			.parse(TupleType.SPACES)\
			.parse(TupleType.SUBJECTS)\
			.parse(TupleType.REPORTS)
	
	def parse(self, tuple_type: TupleType):
		record_ids = self.get_record_ids_with_current_version(tuple_type)
		if len(record_ids) != 0:
			self.build_scripts(record_ids, tuple_type)
		return self
	
	def build_scripts(self, record_ids: List[str], tuple_type: str):
		if tuple_type == TupleType.TOPICS:
			file_name = "0001-topics.dml.sql"
			key = "topic_id"
		if tuple_type == TupleType.PIPELINES:
			file_name = "0002-pipelines.dml.sql"
			key = "pipelines_id"
		if tuple_type == TupleType.SPACES:
			file_name = "0003-spaces.dml.sql"
			key = "space_id"
		if tuple_type == TupleType.SUBJECTS:
			file_name = "0004-subjects.dml.sql"
			key = "subject_id"
		if tuple_type == TupleType.REPORTS:
			file_name = "0005-reports.dml.sql"
			key = "report_id"
		file = StringIO()
		try:
			for i, record_id in enumerate(record_ids, start=1):
				operation = self.operation_service.get_operation_by_id(record_id)
				self.build_meta_script_file(operation, file, key)
				if operation.tupleType == TupleType.TOPICS:
					self.build_data_script_file(operation, i)
			self.meta_files.append(
				MetaScriptFile(name=file_name, content=file.getvalue(), datasource_type=self.meta_datasource_type))
		finally:
			file.close()
	
	def build_meta_script_file(self, operation: Operation, file: StringIO, key: str):
		if self.operation_service.get_previous_record_id(operation.tupleId, operation.versionNum):
			script = self.meta_script_builder.generate_update_statement(operation.tupleType,
			                                                            key,
			                                                            operation.content)
		else:
			script = self.meta_script_builder.generate_insert_into_statement(operation.tupleType,
			                                                                 operation.content)
		file.write(script)
		return file
	
	# noinspection PyTypeChecker
	def build_data_script_file(self, operation: Operation, sequence: int):
		
		def create_topic_table_file(builder: ScriptBuilder, new: Topic) -> StringIO:
			file.write(builder.generate_create_table_statement(new))
			return file
		
		def alert_topic_table_file(builder: ScriptBuilder, new: Topic, old: Topic) -> StringIO:
			file.write('\n'.join(builder.generate_alert_table_statement(new, old)))
			file.write('\n')
			file.write('\n'.join(builder.generate_unique_indexes_statement(new)))
			file.write('\n')
			file.write('\n'.join(builder.generate_index_statement(new)))
			return file
		
		topic_service = get_topic_service(self.operation_service)
		topic: Topic = topic_service.get_entity_shaper().deserialize(operation.content)
		
		if topic.dataSourceId is None:
			raise RuntimeError(f"{topic.name} doesn't have datasource.")
		
		datasource = DataSourceService(self.operation_service.principalService).find_by_id(topic.dataSourceId)
		data_script_builder = script_builder_factory(datasource.dataSourceType)
		file_name = build_file_name(sequence, f"topic_{topic.name}.ddl.sql")
		file = StringIO()
		try:
			record_id = self.operation_service.get_previous_record_id(operation.tupleId, operation.versionNum)
			if record_id:
				previous_operation = self.operation_service.get_operation_by_id(record_id)
				previous_topic = topic_service.get_entity_shaper().deserialize(previous_operation.content)
				self.data_files.append(
					DataScriptFile(name=file_name,
					               content=alert_topic_table_file(data_script_builder, topic,
					                                              previous_topic).getvalue(),
					               datasource_type=datasource.dataSourceType,
					               datasource_id=datasource.dataSourceId)
				)
			else:
				self.data_files.append(
					DataScriptFile(name=file_name,
					               content=create_topic_table_file(data_script_builder, topic).getvalue(),
					               datasource_type=datasource.dataSourceType,
					               datasource_id=datasource.dataSourceId)
				)
		finally:
			file.close()
	
	def get_script_files(self) -> Tuple[List[ScriptFile], List[ScriptFile]]:
		return self.meta_files, self.data_files
