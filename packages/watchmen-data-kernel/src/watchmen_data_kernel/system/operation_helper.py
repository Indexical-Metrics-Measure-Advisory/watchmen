from __future__ import annotations
from pydantic import BaseModel
from enum import Enum
from typing import List, Tuple, Any, Optional
from io import BytesIO, StringIO
import zipfile

from watchmen_data_kernel.meta import DataSourceService

from watchmen_meta.admin import TopicService
from watchmen_meta.common import RecordOperationService, ask_meta_storage_type, PackageVersionService

from watchmen_model.system import Operation, DataSourceType, OperationType
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


class SqlScriptFile(BaseModel):
	name: str
	content: str
	data_source_type: DataSourceType


class ChangeLogFile(BaseModel):
	name: str
	content: str


class PackageZipFile(BaseModel):
	name: str
	content: Any


TUPLE_SEQUENCE = {
	TupleType.TOPICS: "0001",
	TupleType.PIPELINES: "0002",
	TupleType.SPACES: "0003",
	TupleType.SUBJECTS: "0004",
	TupleType.REPORTS: "0005"
}


class OperationScriptBuilder:

	def __init__(self, operation_service: RecordOperationService):
		self.operation_service = operation_service
		self.meta_script_builder = script_builder_factory(ask_meta_storage_type())
		self.package_version = PackageVersionService(operation_service.storage,
		                                             operation_service.snowflakeGenerator,
		                                             operation_service.principalService).find_one()
		self.meta_files: List[SqlScriptFile] = []
		self.data_files: List[SqlScriptFile] = []

	def build_all(self) -> OperationScriptBuilder:
		return self.build(TupleType.TOPICS) \
			.build(TupleType.PIPELINES) \
			.build(TupleType.SPACES) \
			.build(TupleType.SUBJECTS) \
			.build(TupleType.REPORTS)

	def build(self, tuple_type: TupleType):
		record_ids = self.get_record_ids_with_current_version(tuple_type)
		if len(record_ids) != 0:
			self.make_sql_scripts(record_ids, tuple_type)
		return self

	def get_record_ids_with_current_version(self, tuple_type: TupleType) -> List[str]:
		record_rows = self.operation_service.get_record_ids(self.package_version.currVersion,
		                                                    tuple_type)
		record_ids = ArrayHelper(record_rows).map(lambda x: x.get("record_id")).to_list()
		return record_ids

	def make_sql_scripts(self, record_ids: List[str], tuple_type: str):
		# noinspection PyTypeChecker
		file_name = f"{TUPLE_SEQUENCE.get(tuple_type)}-{tuple_type}.dml.sql"
		file = StringIO()
		try:
			for sequence, record_id in enumerate(record_ids, start=1):
				operation = self.operation_service.get_operation_by_id(record_id)
				file.write(self.build_meta_script_file(operation))
				if operation.tupleType == TupleType.TOPICS:
					self.build_data_script_file(operation, sequence)
			# noinspection PyUnresolvedReferences,PyUnboundLocalVariable
			self.meta_files.append(
				SqlScriptFile(name=file_name, content=file.getvalue(), data_source_type=ask_meta_storage_type()))
		finally:
			file.close()

	def build_meta_script_file(self, operation: Operation) -> str:
		if operation.operationType == OperationType.UPDATE:
			return self.meta_script_builder.sql_update(operation.tupleType, operation.tupleKey, operation.content)
		elif operation.operationType == OperationType.CREATE:
			return self.meta_script_builder.sql_insert(operation.tupleType, operation.content)
		else:
			NotImplemented(
				f"The operation type: {operation.operationType} is not supported. The record id: {operation.recordId}")

	# noinspection PyTypeChecker
	def build_data_script_file(self, operation: Operation, sequence: int):

		def create_topic_table_file(builder: ScriptBuilder, new: Topic) -> StringIO:
			file.write(builder.sql_create_table(new))
			return file

		def alert_topic_table_file(builder: ScriptBuilder, new: Topic, old: Topic) -> StringIO:
			file.write('\n'.join([*builder.sql_alert_table(new, old),
			                      *builder.sql_unique_indexes(new),
			                      *builder.sql_index(new)]))
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
					SqlScriptFile(name=file_name,
					              content=alert_topic_table_file(data_script_builder, topic, previous_topic).getvalue(),
					              data_source_type=datasource.dataSourceType)
				)
			else:
				self.data_files.append(
					SqlScriptFile(name=file_name,
					              content=create_topic_table_file(data_script_builder, topic).getvalue(),
					              data_source_type=datasource.dataSourceType)
				)
		finally:
			file.close()

	def package_zip(self) -> PackageZipFile:
		return build_package_zip(self.meta_files,
		                         self.data_files,
		                         generate_change_log_file(self.package_version.currVersion, self.meta_files),
		                         generate_change_log_file(self.package_version.currVersion, self.data_files),
		                         self.package_version.currVersion)


def get_topic_service(operation_service: RecordOperationService) -> TopicService:
	return TopicService(operation_service.storage, operation_service.snowflakeGenerator,
	                    operation_service.principalService)


def build_package_zip(meta_files: List[SqlScriptFile],
                      data_files: List[SqlScriptFile],
                      meta_change_log: ChangeLogFile,
                      data_change_log: ChangeLogFile,
                      version: str) -> PackageZipFile:
	_io = BytesIO()
	zf = zipfile.ZipFile(_io, 'w', zipfile.ZIP_DEFLATED)
	zf.writestr(f"meta/", "")
	if meta_files:
		ArrayHelper(meta_files).each(lambda file: zf.writestr(f"meta/{version}/{file.name}", file.content))
		zf.writestr(f"meta/{version}/{meta_change_log.name}", meta_change_log.content)
	zf.writestr(f"data/", "")
	if data_files:
		ArrayHelper(data_files).each(lambda file: zf.writestr(f"data/{version}/{file.name}", file.content))
		zf.writestr(f"data/{version}/{data_change_log.name}", data_change_log.content)
	zf.close()
	return PackageZipFile(name=f"script_{version}", content=_io)


def generate_change_log_file(version: str, files: List[SqlScriptFile]) -> Optional[ChangeLogFile]:
	change_log = ChangelogXml(version)
	ArrayHelper(files).each(lambda file: change_log.build_change_file(file.name, file.data_source_type))
	return ChangeLogFile(name=change_log.file_name, content=change_log.get_change_log_content())


def build_file_name(sequence: int, file_name: str) -> str:
	prefix = str(sequence).rjust(4, '0')
	return f"{prefix}-{file_name}"


def script_builder_factory(data_source_type: DataSourceType) -> ScriptBuilder:
	if data_source_type == DataSourceType.MYSQL:
		from watchmen_storage_mysql import ScriptBuilderMySQL
		return ScriptBuilderMySQL()
	if data_source_type == DataSourceType.MSSQL:
		from watchmen_storage_mssql import ScriptBuilderMSSQL
		return ScriptBuilderMSSQL()
	if data_source_type == DataSourceType.ORACLE:
		from watchmen_storage_oracle import ScriptBuilderOracle
		return ScriptBuilderOracle()
	if data_source_type == DataSourceType.POSTGRESQL:
		from watchmen_storage_postgresql import ScriptBuilderPostgreSQL
		return ScriptBuilderPostgreSQL()
