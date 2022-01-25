from datetime import datetime
from typing import List

from watchmen_storage.competitive_worker_id_generator import CompetitiveWorker, CompetitiveWorkerIdGenerator, \
	default_heart_beat_interval
from watchmen_storage.storage_spi import StorageSPI
from watchmen_storage.storage_types import EntityCriteria, EntityFinder, EntityHelper, EntityRow, EntityShaper, \
	EntityUpdate, \
	EntityUpdater

SNOWFLAKE_WORKER_ID_TABLE = 'snowflake_worker_id'


# Table("snowflake_workerid", self.metadata,
#                                      Column('ip', String(100), primary_key=True),
#                                      Column('processid', String(60), primary_key=True),
#                                      Column('workerid', Integer, nullable=False),
#                                      Column('regdate', Date, nullable=True)
#                                      )

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
			self, data_center_id: int,
			storage: StorageSPI,
			heart_beat_interval: int = default_heart_beat_interval()
	):
		super().__init__(data_center_id, heart_beat_interval)
		self.storage = storage

	def first_declare_myself(self, worker: CompetitiveWorker) -> None:
		worker.lastBeatAt = datetime.now().replace(tzinfo=None)
		self.storage.insert_one(
			worker,
			EntityHelper(
				name=SNOWFLAKE_WORKER_ID_TABLE,
				shaper=COMPETITIVE_WORKER_SHAPER
			)
		)

	def acquire_used_worker_ids(self) -> List[int]:
		return self.storage.find_distinct_values(
			'worker_id',
			EntityFinder(
				name=SNOWFLAKE_WORKER_ID_TABLE,
				shaper=COMPETITIVE_WORKER_SHAPER,
				criteria=EntityCriteria(data_center_id=self.data_center_id)
			)
		)

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
