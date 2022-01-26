from datetime import datetime, timedelta
from logging import getLogger
from typing import List

from funct import Array

from watchmen_storage.competitive_worker_id_generator import CompetitiveWorker, CompetitiveWorkerIdGenerator, \
	default_heart_beat_interval, default_worker_creation_retry_times, WorkerFirstDeclarationException
from watchmen_storage.storage_spi import StorageSPI
from watchmen_storage.storage_types import EntityCriteria, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityRow, EntityShaper, EntityUpdate, EntityUpdater

SNOWFLAKE_WORKER_ID_TABLE = 'snowflake_worker_id'


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
			ip=row['ip'],
			processId=row['process_id'],
			dataCenterId=row['data_center_id'],
			workerId=row['worker_id'],
			registeredAt=row['registered_at'],
			lastBeatAt=row['last_beat_at']
		)


COMPETITIVE_WORKER_SHAPER = CompetitiveWorkerShaper()


class StorageBasedWorkerIdGenerator(CompetitiveWorkerIdGenerator):
	"""
	Table(snowflake_worker_id)
		ip, process_id, data_center_id, worker_id, registered_at, last_beat_at
	"""

	def __init__(
			self,
			storage: StorageSPI,
			data_center_id: int = 0,
			heart_beat_interval: int = default_heart_beat_interval(),
			worker_creation_retry_times: int = default_worker_creation_retry_times()
	):
		super().__init__(data_center_id, heart_beat_interval, worker_creation_retry_times)
		self.storage = storage

	@staticmethod
	def is_abandoned(worker: CompetitiveWorker) -> bool:
		return (datetime.now().replace(tzinfo=None) - worker.lastBeatAt).days >= 1

	def first_declare_myself(self, worker: CompetitiveWorker) -> None:
		existing_workers = self.storage.find(
			EntityFinder(
				name=SNOWFLAKE_WORKER_ID_TABLE,
				shaper=COMPETITIVE_WORKER_SHAPER,
				criteria=EntityCriteria(
					data_center_id=worker.dataCenterId,
					worker_id=worker.workerId
				)
			)
		)

		workers_count = len(existing_workers)
		if workers_count == 0:
			# worker not exists
			worker.lastBeatAt = datetime.now().replace(tzinfo=None)
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
			if StorageBasedWorkerIdGenerator.is_abandoned(existing_worker):
				# worker last beat before 1 day, treat it as abandoned
				# replace it
				worker.lastBeatAt = datetime.now().replace(tzinfo=None)
				updated_count = self.storage.update_only(
					EntityUpdater(
						name=SNOWFLAKE_WORKER_ID_TABLE,
						shaper=COMPETITIVE_WORKER_SHAPER,
						criteria=EntityCriteria(
							data_center_id=self.data_center_id,
							worker_id=worker.workerId,
							last_beat_at=EntityCriteriaExpression(
								operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
								value=(datetime.now().replace(tzinfo=None) + timedelta(days=-1))
							)
						),
						update=EntityUpdate(
							ip=worker.ip,
							process_id=worker.processId,
							registered_at=worker.registeredAt,
							last_beat_at=datetime.now().replace(tzinfo=None)
						)
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

	def acquire_alive_worker_ids(self) -> List[int]:
		rows = self.storage.find_distinct_values(
			EntityDistinctValuesFinder(
				name=SNOWFLAKE_WORKER_ID_TABLE,
				shaper=COMPETITIVE_WORKER_SHAPER,
				# workers last beat at in 1 day, means still alive
				criteria=EntityCriteria(
					data_center_id=self.data_center_id,
					last_beat_at=EntityCriteriaExpression(
						operator=EntityCriteriaOperator.GREATER_THAN,
						value=(datetime.now().replace(tzinfo=None) + timedelta(days=-1))
					)
				),
				distinctColumnNames=['worker_id']
			)
		)
		return Array(rows).map(lambda x: x.workerId)

	def declare_myself(self, worker: CompetitiveWorker) -> None:
		self.storage.update_only(
			EntityUpdater(
				name=SNOWFLAKE_WORKER_ID_TABLE,
				shaper=COMPETITIVE_WORKER_SHAPER,
				criteria=EntityCriteria(
					data_center_id=self.data_center_id,
					worker_id=worker.workerId
				),
				update=EntityUpdate(
					last_beat_at=datetime.now().replace(tzinfo=None)
				)
			)
		)
