"""
Performance test for the collector batch insert flow (happy path), against a real PostgreSQL database.

Prerequisite and run command: see test_batch_insert.py docstring, then run this module directly:
	... same env ... ../watchmen-data-kernel/.venv/bin/python test/watchmen_collector_batch_test/perf_batch_insert.py

What is measured:
	1. ChangeDataRecordService.create_change_records at scales of 1k/5k/10k/50k records
	   (the execution path used by BatchCollectorSharder, insert_all in chunks of 1000).
	2. Baseline comparison: 1000 records inserted one-by-one via create_change_record
	   (one transaction per row), to quantify the value of batching.
	3. CollectorBatchTableConfigService.create_config one-by-one (one transaction per row,
	   the current behavior of batch_table_config_router.py) vs. the same rows created
	   within a single transaction, to quantify the per-row transaction overhead.
"""
import sys
import time
from typing import Callable, List

from sqlalchemy import text

# reuse fixtures (ddl, connection settings, fake principal) from the unittest module
from watchmen_collector_batch_test.test_batch_insert import \
	CollectorBatchInsertTest, MANAGED_TABLES, RECORD_COUNT, TENANT_ID
from watchmen_collector_batch.model.batch_table_config import BatchTableConfig, FieldsMapping
from watchmen_collector_batch.storage.batch_table_config_service import get_collector_batch_table_config_service
from watchmen_collector_kernel.model import ChangeDataRecord
from watchmen_collector_kernel.storage import get_change_data_record_service


class PerfReport:
	def __init__(self):
		self.rows: List[tuple] = []

	def add(self, case: str, count: int, elapsed: float):
		self.rows.append((case, count, elapsed, count / elapsed if elapsed > 0 else 0))

	def render(self) -> str:
		lines = [
			'',
			f'{"case":<58}{"rows":>8}{"elapsed(s)":>12}{"rows/s":>12}',
			'-' * 90
		]
		for case, count, elapsed, rate in self.rows:
			lines.append(f'{case:<58}{count:>8}{elapsed:>12.3f}{rate:>12.0f}')
		return '\n'.join(lines)


def truncate_all(engine) -> None:
	with engine.begin() as connection:
		for table_name in MANAGED_TABLES:
			connection.execute(text(f'DELETE FROM {table_name}'))


def count_of(engine, table_name: str) -> int:
	with engine.connect() as connection:
		return connection.execute(text(f'SELECT COUNT(1) FROM {table_name}')).scalar()


def timed(report: PerfReport, case: str, count: int, action: Callable[[], None]) -> None:
	started_at = time.perf_counter()
	action()
	elapsed = time.perf_counter() - started_at
	report.add(case, count, elapsed)


def perf_change_records_batch(fixture, report: PerfReport, scales: List[int]) -> None:
	service = get_change_data_record_service(
		fixture.storage, fixture.snowflake_generator, fixture.principal_service)
	for scale in scales:
		truncate_all(fixture.engine)
		records = fixture.create_fake_change_records(scale)
		timed(report, f'change_records: batch insert (chunk=1000)', scale,
		      lambda: service.create_change_records(records))
		actual = count_of(fixture.engine, 'change_data_record')
		assert actual == scale, f'expected {scale} rows, got {actual}'


def perf_change_records_one_by_one(fixture, report: PerfReport, count: int) -> None:
	service = get_change_data_record_service(
		fixture.storage, fixture.snowflake_generator, fixture.principal_service)
	truncate_all(fixture.engine)
	records: List[ChangeDataRecord] = fixture.create_fake_change_records(count)

	def insert_one_by_one():
		for record in records:
			service.create_change_record(record)

	timed(report, 'change_records: one-by-one (tx per row)', count, insert_one_by_one)
	actual = count_of(fixture.engine, 'change_data_record')
	assert actual == count, f'expected {count} rows, got {actual}'


def create_fake_configs(fixture, count: int) -> List[BatchTableConfig]:
	return [
		BatchTableConfig(
			configId=fixture.snowflake_generator.next_id(),
			name=f'orders_{index}',
			sourceTableName='orders',
			targetTableName=f'dwd_orders_{index}',
			fieldsMapping=[FieldsMapping(sourceFieldName='order_id', targetFieldName='order_id')],
			primaryKey=['order_id'],
			actionType='insert',
			pipelineId='pipeline-1',
			tenantId=TENANT_ID
		)
		for index in range(count)
	]


def perf_table_configs(fixture, report: PerfReport, count: int) -> None:
	service = get_collector_batch_table_config_service(
		fixture.storage, fixture.snowflake_generator, fixture.principal_service)

	# current router behavior: one transaction per config
	truncate_all(fixture.engine)
	configs = create_fake_configs(fixture, count)

	def create_one_by_one():
		for config in configs:
			service.create_config(config)

	timed(report, 'batch_table_config: one-by-one (tx per row)', count, create_one_by_one)
	assert count_of(fixture.engine, 'collector_batch_table_config') == count

	# comparison: same inserts within a single transaction
	truncate_all(fixture.engine)
	configs = create_fake_configs(fixture, count)

	def create_in_single_transaction():
		service.begin_transaction()
		try:
			for config in configs:
				service.create(config)
			service.commit_transaction()
		except Exception as e:
			service.rollback_transaction()
			raise e
		finally:
			service.close_transaction()

	timed(report, 'batch_table_config: single transaction', count, create_in_single_transaction)
	assert count_of(fixture.engine, 'collector_batch_table_config') == count


def main() -> None:
	fixture = CollectorBatchInsertTest()
	CollectorBatchInsertTest.setUpClass()
	report = PerfReport()
	try:
		perf_change_records_batch(fixture, report, scales=[1000, 5000, 10000, 50000])
		perf_change_records_one_by_one(fixture, report, count=RECORD_COUNT)
		perf_table_configs(fixture, report, count=200)
	finally:
		CollectorBatchInsertTest.tearDownClass()
	print(report.render())


if __name__ == '__main__':
	sys.exit(main())
