"""
Happy-path tests for the collector batch insert flow, against a real PostgreSQL database.

Prerequisite:
	a PostgreSQL instance with a database named `watchmen_batch_test`, e.g. the local docker container:
		docker run --name watchmen-pg-bypass -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
		docker exec watchmen-pg-bypass psql -U postgres -c "CREATE DATABASE watchmen_batch_test"

Run (from packages/watchmen-collector-batch):
	META_STORAGE_TYPE=postgresql META_STORAGE_HOST=localhost META_STORAGE_PORT=5432 \
	META_STORAGE_USER_NAME=postgres META_STORAGE_PASSWORD=postgres META_STORAGE_NAME=watchmen_batch_test \
	SNOWFLAKE_COMPETITIVE_WORKERS=false \
	PYTHONPATH="../watchmen-model/src:../watchmen-utilities/src:../watchmen-storage/src:../watchmen-storage-rds/src:../watchmen-storage-postgresql/src:../watchmen-auth/src:src:../watchmen-collector-kernel/src" \
	../watchmen-data-kernel/.venv/bin/python -m unittest discover -s test -p "test_*.py" -v

Notes on the environment variables:
	- importing watchmen_meta.common initializes a snowflake worker against the meta storage at import time,
	  so META_STORAGE_* must point to a reachable database and SNOWFLAKE_COMPETITIVE_WORKERS is disabled
	  to avoid registering a worker during tests.
	- PYTHONPATH prepends local sources because the venv site-packages versions lag behind the local code.

Covered normal path:
	1. ChangeDataRecordService.create_change_records — the batch insert used by BatchCollectorSharder
	   (shard scan -> change records -> insert_all in chunks of 1000), verified with 1000 records.
	2. ChangeDataRecordService.create_change_record — the non-batch single-row path
	   (used by BatchCollectorSharder.save_change_data_record), one transaction per row,
	   verified with the same 1000 records for comparison.
	3. CollectorBatchTableConfigService — create / find / delete_by_tenant_id, the storage operations
	   behind batch_table_config_router.py.
"""
import time
from typing import List
from unittest import TestCase

from sqlalchemy import create_engine, text
from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ChangeDataRecord, Status
from watchmen_collector_kernel.storage import get_change_data_record_service
from watchmen_model.admin import User, UserRole
from watchmen_storage import SnowflakeGenerator
from watchmen_storage_postgresql import StoragePostgreSQLConfiguration

from watchmen_collector_batch.model.batch_table_config import BatchTableConfig, FieldsMapping
from watchmen_collector_batch.storage.batch_table_config_service import get_collector_batch_table_config_service

PG_HOST = 'localhost'
PG_PORT = 5432
PG_DATABASE = 'watchmen_batch_test'
PG_USERNAME = 'postgres'
PG_PASSWORD = 'postgres'

TENANT_ID = '1'
RECORD_COUNT = 1000

# consolidated from the official pg meta-scripts (watchmen-storage-postgresql/meta-scripts):
# change_data_record = 16.4.9/00007 (create) + 16.5.9/00006 (module_trigger_id) + 16.5.19/00001 (status)
#   + 17.1.0/00308 (decimal -> bigint)
# collector_batch_table_config = 18.1.1/00002
# note: do not create tables from sqlalchemy metadata (table_defs) — production ddl uses SMALLINT
# for booleans, matching the storage engine's supports_native_boolean=False behavior
DDL_STATEMENTS = [
	"""
	CREATE TABLE change_data_record
	(
		change_record_id        BIGINT          NOT NULL,
		model_name              VARCHAR(50)     NOT NULL,
		table_name              VARCHAR(50)     NOT NULL,
		data_id                 JSON            NOT NULL,
		root_table_name         VARCHAR(50),
		root_data_id            JSON,
		is_merged               SMALLINT        NOT NULL,
		status                  SMALLINT,
		result                  JSON,
		table_trigger_id        BIGINT          NOT NULL,
		model_trigger_id        BIGINT          NOT NULL,
		module_trigger_id       BIGINT          NOT NULL,
		event_trigger_id        BIGINT          NOT NULL,
		tenant_id               VARCHAR(50)     NOT NULL,
		created_at              TIMESTAMP       NOT NULL,
		created_by              VARCHAR(50)     NOT NULL,
		last_modified_at        TIMESTAMP       NOT NULL,
		last_modified_by        VARCHAR(50)     NOT NULL,
		CONSTRAINT pk_change_data_record PRIMARY KEY (change_record_id)
	)
	""",
	"""
	CREATE TABLE collector_batch_table_config
	(
		config_id            BIGINT       NOT NULL,
		name                 VARCHAR(100) NOT NULL,
		source_table_name    VARCHAR(100) NOT NULL,
		target_table_name    VARCHAR(100) NOT NULL,
		fields_mapping       JSON,
		primary_key          JSON,
		action_type          VARCHAR(50)  NOT NULL,
		pipeline_id          VARCHAR(50)  NOT NULL,
		loop_entity_name     VARCHAR(100),
		tenant_id            VARCHAR(50)  NOT NULL,
		created_at           TIMESTAMP    NOT NULL,
		created_by           VARCHAR(50)  NOT NULL,
		last_modified_at     TIMESTAMP    NOT NULL,
		last_modified_by     VARCHAR(50)  NOT NULL,
		version              INTEGER,
		CONSTRAINT pk_collector_batch_table_config PRIMARY KEY (config_id)
	)
	"""
]

MANAGED_TABLES = ['change_data_record', 'collector_batch_table_config']


def create_fake_principal_service() -> PrincipalService:
	return PrincipalService(User(userId='1', tenantId=TENANT_ID, name='imma-admin', role=UserRole.ADMIN))


def create_snowflake_generator() -> SnowflakeGenerator:
	return SnowflakeGenerator(data_center_id=0, generate_worker_id=lambda: 1)


def build_storage_url() -> str:
	return f'postgresql+psycopg2://{PG_USERNAME}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DATABASE}'


def build_storage():
	return StoragePostgreSQLConfiguration.config() \
		.host(PG_HOST, PG_PORT) \
		.account(PG_USERNAME, PG_PASSWORD) \
		.schema(PG_DATABASE) \
		.echo(False) \
		.build()


class CollectorBatchInsertTest(TestCase):
	engine = None
	storage = None
	snowflake_generator = None
	principal_service = None

	@classmethod
	def setUpClass(cls):
		cls.engine = create_engine(build_storage_url(), future=True)
		with cls.engine.begin() as connection:
			for statement in DDL_STATEMENTS:
				connection.execute(text(statement))
		cls.storage = build_storage()
		cls.snowflake_generator = create_snowflake_generator()
		cls.principal_service = create_fake_principal_service()

	@classmethod
	def tearDownClass(cls):
		with cls.engine.begin() as connection:
			for table_name in MANAGED_TABLES:
				connection.execute(text(f'DROP TABLE IF EXISTS {table_name}'))
		cls.engine.dispose()

	def setUp(self):
		with self.engine.begin() as connection:
			for table_name in MANAGED_TABLES:
				connection.execute(text(f'DELETE FROM {table_name}'))

	def create_fake_change_records(self, count: int) -> List[ChangeDataRecord]:
		# same shape as produced by BatchCollectorSharder.source_to_change
		return [
			ChangeDataRecord(
				changeRecordId=self.snowflake_generator.next_id(),
				modelName='order_model',
				tableName='orders',
				dataId={'order_id': index},
				isMerged=False,
				status=Status.INITIAL.value,
				tableTriggerId=100,
				modelTriggerId=10,
				moduleTriggerId=1,
				eventTriggerId=1000,
				tenantId=TENANT_ID
			)
			for index in range(count)
		]

	def assert_change_records_written(self, expected_count: int):
		with self.engine.connect() as connection:
			count = connection.execute(text('SELECT COUNT(1) FROM change_data_record')).scalar()
			self.assertEqual(expected_count, count)

			row = connection.execute(
				text('SELECT data_id, is_merged, status, tenant_id, created_by, created_at '
				     'FROM change_data_record ORDER BY change_record_id LIMIT 1')
			).mappings().first()
			self.assertIsNotNone(row)
			self.assertEqual({'order_id': 0}, row['data_id'])
			self.assertFalse(row['is_merged'])
			self.assertEqual(Status.INITIAL.value, row['status'])
			self.assertEqual(TENANT_ID, row['tenant_id'])
			# auditable columns must be filled by try_to_prepare_auditable_on_create
			self.assertEqual(self.principal_service.userId, row['created_by'])
			self.assertIsNotNone(row['created_at'])

	def test_create_1000_change_records(self):
		service = get_change_data_record_service(self.storage, self.snowflake_generator, self.principal_service)
		records = self.create_fake_change_records(RECORD_COUNT)

		started_at = time.perf_counter()
		service.create_change_records(records)
		elapsed = time.perf_counter() - started_at
		print(f'\ninsert {RECORD_COUNT} change records (batch) elapsed: {elapsed:.3f}s')

		self.assert_change_records_written(RECORD_COUNT)

	def test_create_1000_change_records_one_by_one(self):
		# non-batch single-row path: BatchCollectorSharder.save_change_data_record ->
		# ChangeDataRecordService.create_change_record, one transaction per record
		service = get_change_data_record_service(self.storage, self.snowflake_generator, self.principal_service)
		records = self.create_fake_change_records(RECORD_COUNT)

		started_at = time.perf_counter()
		for record in records:
			service.create_change_record(record)
		elapsed = time.perf_counter() - started_at
		print(f'\ninsert {RECORD_COUNT} change records (one-by-one) elapsed: {elapsed:.3f}s')

		self.assert_change_records_written(RECORD_COUNT)

	def test_batch_table_config_storage(self):
		service = get_collector_batch_table_config_service(
			self.storage, self.snowflake_generator, self.principal_service)

		for index in range(10):
			service.create_config(BatchTableConfig(
				configId=self.snowflake_generator.next_id(),
				name=f'orders_{index}',
				sourceTableName='orders',
				targetTableName=f'dwd_orders_{index}',
				fieldsMapping=[FieldsMapping(sourceFieldName='order_id', targetFieldName='order_id')],
				primaryKey=['order_id'],
				actionType='insert',
				pipelineId='pipeline-1',
				tenantId=TENANT_ID
			))

		found = service.find_batch_table_config_by_names('orders_0', 'orders', 'dwd_orders_0', TENANT_ID)
		self.assertIsNotNone(found)
		self.assertEqual(['order_id'], found.primaryKey)

		# note: find_all does not manage the connection by itself (unlike its sibling methods),
		# caller must hold an open connection
		service.storage.connect()
		try:
			configs = service.find_all(TENANT_ID)
			self.assertEqual(10, len(configs))
		finally:
			service.storage.close()

		service.delete_by_tenant_id(TENANT_ID)
		service.storage.connect()
		try:
			configs = service.find_all(TENANT_ID)
			self.assertEqual(0, len(configs))
		finally:
			service.storage.close()
