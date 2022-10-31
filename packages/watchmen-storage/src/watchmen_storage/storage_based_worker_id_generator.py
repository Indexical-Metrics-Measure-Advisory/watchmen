from datetime import timedelta
from logging import getLogger
from typing import List

from watchmen_utilities import ArrayHelper, get_current_time_in_seconds
from .competitive_worker_id_generator import CompetitiveWorker, CompetitiveWorkerIdGenerator, \
	CompetitiveWorkerShutdownListener, default_heart_beat_interval, default_worker_creation_retry_times, \
	WorkerDeclarationException, WorkerFirstDeclarationException
from .storage_spi import TransactionalStorageSPI
from .storage_types import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityRow, EntityShaper, EntityUpdater

SNOWFLAKE_WORKER_ID_TABLE = 'snowflake_competitive_workers'


class CompetitiveWorkerShaper(EntityShaper):
	def serialize(self, entity: CompetitiveWorker) -> EntityRow:
		return {
			'ip': entity.ip,
			'process_id': entity.processId,
			'data_center_id': entity.dataCenterId,
			'worker_id': entity.workerId,
			'registered_at': entity.registeredAt,
			'last_beat_at': entity.lastBeatAt
		}

	def deserialize(self, row: EntityRow) -> CompetitiveWorker:
		return CompetitiveWorker(
			ip=row.get('ip'),
			processId=row.get('process_id'),
			dataCenterId=row.get('data_center_id'),
			workerId=row.get('worker_id'),
			registeredAt=row.get('registered_at'),
			lastBeatAt=row.get('last_beat_at')
		)


COMPETITIVE_WORKER_SHAPER = CompetitiveWorkerShaper()


class StorageBasedWorkerIdGenerator(CompetitiveWorkerIdGenerator):
	"""
	Table(snowflake_worker_id)
		ip, process_id, data_center_id, worker_id, registered_at, last_beat_at
	"""

	def __init__(
			self,
			storage: TransactionalStorageSPI,
			data_center_id: int = 0,
			heart_beat_interval: int = default_heart_beat_interval(),
			worker_creation_retry_times: int = default_worker_creation_retry_times(),
			shutdown_listener: CompetitiveWorkerShutdownListener = None
	):
		self.storage = storage
		super().__init__(data_center_id, heart_beat_interval, worker_creation_retry_times, shutdown_listener)

	def is_abandoned(self, worker: CompetitiveWorker) -> bool:
		return (get_current_time_in_seconds() - worker.lastBeatAt).seconds > self.heartBeatInterval + 60

	def first_declare_myself(self, worker: CompetitiveWorker) -> None:
		self.storage.begin()

		try:
			existing_workers = self.storage.find(
				EntityFinder(
					name=SNOWFLAKE_WORKER_ID_TABLE,
					shaper=COMPETITIVE_WORKER_SHAPER,
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='data_center_id'), right=worker.dataCenterId),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='worker_id'), right=worker.workerId)
					]
				)
			)

			workers_count = len(existing_workers)
			if workers_count == 0:
				# worker not exists
				worker.lastBeatAt = get_current_time_in_seconds()
				# handle insert failed when other process already did it, may raise exception
				try:
					self.storage.insert_one(
						worker,
						EntityHelper(name=SNOWFLAKE_WORKER_ID_TABLE, shaper=COMPETITIVE_WORKER_SHAPER)
					)
				except Exception as e:
					getLogger(__name__).error(e, exc_info=True, stack_info=True)
					raise WorkerFirstDeclarationException(
						f'Failed to declare worker[dataCenterId={worker.dataCenterId}, workerId={worker.workerId}], '
						f'there might be an existing one in storage.')
			elif workers_count == 1:
				# noinspection PyTypeChecker
				existing_worker: CompetitiveWorker = existing_workers[0]
				if self.is_abandoned(existing_worker):
					# worker last beat before (heartBeatInterval + 60) seconds, treat it as abandoned
					# replace it
					worker.lastBeatAt = get_current_time_in_seconds()
					updated_count = self.storage.update_only(
						EntityUpdater(
							name=SNOWFLAKE_WORKER_ID_TABLE,
							shaper=COMPETITIVE_WORKER_SHAPER,
							criteria=[
								EntityCriteriaExpression(
									left=ColumnNameLiteral(columnName='data_center_id'), right=self.dataCenterId),
								EntityCriteriaExpression(
									left=ColumnNameLiteral(columnName='worker_id'), right=worker.workerId),
								EntityCriteriaExpression(
									left=ColumnNameLiteral(columnName='last_beat_at'),
									operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
									right=(get_current_time_in_seconds() + timedelta(seconds=-(self.heartBeatInterval + 60)))
								)
							],
							update={
								'ip': worker.ip,
								'process_id': worker.processId,
								'registered_at': worker.registeredAt,
								'last_beat_at': worker.lastBeatAt
							}
						)
					)
					# handle update failed when other process already did it, may raise exception
					if updated_count == 0:
						# no worker had been updated, which means declaration is failed
						raise WorkerFirstDeclarationException(
							f'Failed to declare worker[dataCenterId={worker.dataCenterId}, workerId={worker.workerId}], '
							f'there might be an alive one or not exists in storage.')
				else:
					# the only worker is still alive
					raise WorkerFirstDeclarationException(
						f'Worker[dataCenterId={worker.dataCenterId}, workerId={worker.workerId}, lastBeatAt={worker.lastBeatAt}] '
						f'still alive.')
			else:
				# multiple workers found
				raise WorkerFirstDeclarationException(
					f'Multiple workers[dataCenterId={worker.dataCenterId}, workerId={worker.workerId}, count={workers_count}] '
					f'determined.')
			# commit data
			self.storage.commit_and_close()
		except Exception as e:
			# rollback data
			self.storage.rollback_and_close()
			# rethrow exception
			raise e

	def acquire_alive_worker_ids(self) -> List[int]:
		self.storage.begin()
		try:
			rows = self.storage.find_distinct_values(
				EntityDistinctValuesFinder(
					name=SNOWFLAKE_WORKER_ID_TABLE,
					shaper=COMPETITIVE_WORKER_SHAPER,
					# workers last beat at in （heartBeatInterval + 60） seconds, means still alive
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='data_center_id'), right=self.dataCenterId),
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='last_beat_at'),
							operator=EntityCriteriaOperator.GREATER_THAN,
							right=(get_current_time_in_seconds() + timedelta(seconds=-(self.heartBeatInterval + 60)))
						)
					],
					distinctColumnNames=['worker_id']
				)
			)
			return ArrayHelper(rows).map(lambda x: x.workerId).to_list()
		finally:
			self.storage.close()

	def declare_myself(self, worker: CompetitiveWorker) -> None:
		self.storage.begin()
		try:
			updated_count = self.storage.update_only(
				EntityUpdater(
					name=SNOWFLAKE_WORKER_ID_TABLE,
					shaper=COMPETITIVE_WORKER_SHAPER,
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='data_center_id'), right=self.dataCenterId),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='worker_id'), right=worker.workerId)
					],
					update={'last_beat_at': get_current_time_in_seconds()}
				)
			)
			if updated_count == 0:
				raise WorkerDeclarationException(
					f'Failed to declare worker[dataCenterId={worker.dataCenterId}, workerId={worker.workerId}], '
					f'certain data not found in storage.')

			self.storage.commit_and_close()
		except Exception as e:
			self.storage.rollback_and_close()
			raise e
