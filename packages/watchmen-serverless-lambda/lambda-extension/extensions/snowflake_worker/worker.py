import os
from logging import getLogger
from typing import Optional

from sqlalchemy import text

MIN_DATETIME = '1970-01-01 00:00:00'
MAX_DATETIME = '9999-12-31 23:59:59'

class Worker:
    
    def __init__(self, engine):
        self.engine = engine
        
    def release_worker(self, data_center_id: int, worker_id: int):
        with self.engine.connect() as conn:
            trans = conn.begin()
            try:
                release_sql = """
                DELETE FROM snowflake_competitive_workers
                WHERE data_center_id = :data_center_id AND worker_id = :worker_id
                """
                conn.execute(
                    text(release_sql),
                    {
                        "data_center_id": data_center_id,
                        "worker_id": worker_id
                    }
                )
                trans.commit()
            except Exception as e:
                trans.rollback()
                getLogger(__name__).error(e, exc_info=True, stack_info=True)

    def release_worker_v2(self, data_center_id: int, worker_id: int):
        with self.engine.connect() as conn:
            trans = conn.begin()
            try:
                release_sql = """
                               UPDATE snowflake_workers
                               SET locked = :locked, last_beat_at = :last_beat_at
                               WHERE data_center_id = :data_center_id AND worker_id = :worker_id
                               """
                conn.execute(
                    text(release_sql),
                    {
                        "locked": 0,
                        "last_beat_at": MIN_DATETIME,
                        "data_center_id": data_center_id,
                        "worker_id": worker_id
                    }
                )
                trans.commit()
            except Exception as e:
                trans.rollback()
                getLogger(__name__).error(e, exc_info=True, stack_info=True)


def read_worker_id_from_tmp() -> Optional[int]:
    if os.path.exists('/tmp/worker_id.txt'):
        with open('/tmp/worker_id.txt', 'r') as file:
            worker_id = file.read()
            return worker_id
