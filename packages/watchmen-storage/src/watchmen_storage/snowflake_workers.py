from logging import getLogger

from sqlalchemy import text, Engine, create_engine, TextClause
from sqlalchemy.exc import IntegrityError

from watchmen_utilities import serialize_to_json
from threading import Thread
from time import sleep, time



class WorkerIdAllocateFailedError(Exception):

    def __init__(self, message: str = "Worker ID Allocate Failed，can't start heart beat thread"):
        self.message = message
        super().__init__(self.message)

    def __str__(self):
        return f"[WorkerIdAllocateFailedError] {self.message}"


class DBConfig:

    def __init__(self, type_: str = None, host: str = None, port: int = None, username: str = None,
                 password: str = None, dbname: str = None, schema: str = None):
        self.type = type_
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.dbname = dbname
        self.schema = schema


class SchemaSQL:
    def __init__(self, schema: str=None):
        self.schema = schema

    def get_sql(self, table_name: str, raw_sql: str) -> TextClause:
        if self.schema:
            full_table_name = f"{self.schema}.{table_name}"
            sql_with_schema = raw_sql.format(table=full_table_name)
            return text(sql_with_schema)
        else:
            sql_without_schema = raw_sql.format(table=table_name)
            return text(sql_without_schema)

class SnowflakeWorker:

    def __init__(self, dbconfig: DBConfig,
                 data_center_id: int,
                 min_worker_id: int,
                 max_worker_id: int,
                 heart_beat_interval: int):
        self.data_center_id = data_center_id
        self.min_worker_id = min_worker_id
        self.max_worker_id = max_worker_id
        self.heart_beat_interval = heart_beat_interval
        self.dbconfig = dbconfig
        self.worker = -1
        self.last_heartbeat_timestamp = 0
        self.initialed = False
        self.schema_sql = SchemaSQL(dbconfig.schema)
        self.engine = self.get_engine(self.build_connection_url())
        self.try_create_worker()

    def acquire_table_lock(self, conn):
        try:
            lock_table_sql = "LOCK TABLE {table} IN EXCLUSIVE MODE;"
            conn.execute(
                self.schema_sql.get_sql(table_name="snowflake_workers", raw_sql=lock_table_sql)
            )
        except Exception as e:
            getLogger(__name__).error(e, exc_info=True, stack_info=True)
            raise e

    def release_table_lock(self, conn):
        pass

    def get_current_max_worker_id(self, conn) -> int:
        sql = "SELECT COALESCE(MAX(worker_id), :min_worker - 1) FROM {table}"
        current_max_worker = conn.execute(self.schema_sql.get_sql("snowflake_workers", sql),
                                          {"min_worker": self.min_worker_id}).scalar()
        return current_max_worker


    def initialize(self, conn):
        current_max_worker = self.get_current_max_worker_id(conn)
        if current_max_worker < self.max_worker_id:
            new_worker_ids = range(current_max_worker + 1, self.max_worker_id + 1)
            for worker_id in new_worker_ids:
                try:
                    insert_sql = "INSERT INTO {table} (data_center_id, worker_id, registered_at, last_beat_at, locked) VALUES (:data_center_id, :worker_id, NOW(), NOW(), 0) ON CONFLICT DO NOTHING"
                    conn.execute(
                        self.schema_sql.get_sql("snowflake_workers", insert_sql),
                        {"data_center_id": self.data_center_id, "worker_id": worker_id}
                    )
                except IntegrityError:
                    continue
        else:
            self.initialed = True

    def build_connection_url(self) -> str:
        url = f'postgresql+psycopg2://{self.dbconfig.username}:{self.dbconfig.password}@{self.dbconfig.host}:{self.dbconfig.port}/{self.dbconfig.dbname}?client_encoding=utf8'
        return url

    def get_engine(self, url: str) -> Engine:
        return create_engine(url,
                             json_serializer=serialize_to_json,
                             supports_native_boolean=False)

    def get_unlocked_worker_id(self, conn) -> int:
        worker_id = -1
        trans = conn.begin()
        try:
            lock_sql = """
                    SELECT worker_id 
                    FROM {table} 
                    WHERE locked = 0 
                    ORDER BY worker_id 
                    LIMIT 1 
                    FOR UPDATE SKIP LOCKED
                """
            row = conn.execute(
                self.schema_sql.get_sql("snowflake_workers", lock_sql),
            ).first()
            if row:
                worker_id = row[0]
                update_sql = """
                        UPDATE {table}
                        SET locked = :locked, last_beat_at = NOW()
                        WHERE data_center_id = :data_center_id AND worker_id = :worker_id
                    """
                conn.execute(
                    self.schema_sql.get_sql("snowflake_workers", update_sql),
                    {
                        "locked": 1,
                        "data_center_id": self.data_center_id,
                        "worker_id": worker_id
                    }
                )
            trans.commit()
            return worker_id
        except Exception as e:
            trans.rollback()
            getLogger(__name__).error(e, exc_info=True, stack_info=True)
            return -1


    def initial_workers(self, conn):
        trans = conn.begin()
        try:
            self.acquire_table_lock(conn)
            self.initialize(conn)
            self.release_table_lock(conn)
            trans.commit()
        except Exception as e:
            trans.rollback()
            getLogger(__name__).error(e, exc_info=True, stack_info=True)
            raise e

    def get_timeout_worker_id(self, conn) -> int:
        worker_id = -1
        trans = conn.begin()
        try:
            get_timeout_sql = """
                    SELECT worker_id 
                    FROM {table} 
                    WHERE data_center_id = :data_center_id
                      AND last_beat_at < NOW() - INTERVAL '1.5 minutes' 
                    ORDER BY worker_id 
                    LIMIT 1 
                    FOR UPDATE SKIP LOCKED
                """
            row = conn.execute(
                self.schema_sql.get_sql("snowflake_workers", get_timeout_sql),
                {"data_center_id": self.data_center_id}
            ).first()
            if row:
                worker_id = row[0]
                update_sql = """
                        UPDATE {table}
                        SET locked = :locked, last_beat_at = NOW() 
                        WHERE data_center_id = :data_center_id AND worker_id = :worker_id
                        """
                conn.execute(
                    self.schema_sql.get_sql("snowflake_workers", update_sql),
                    {
                        "locked": 1,
                        "data_center_id": self.data_center_id,
                        "worker_id": worker_id
                    }
                )
            trans.commit()
            return worker_id
        except Exception as e:
            trans.rollback()
            getLogger(__name__).error(e, exc_info=True, stack_info=True)
            return -1

    def get_snowflake_worker_id(self) -> int:
        try:
            with self.engine.connect() as conn:
                if not self.initialed:
                    self.initial_workers(conn)
                worker_id = self.get_unlocked_worker_id(conn)
                if worker_id == -1:
                    worker_id = self.get_timeout_worker_id(conn)
                return worker_id
        except Exception as e:
            getLogger(__name__).error(e, exc_info=True, stack_info=True)
            return -1

    def update_last_heart_beat(self):
        with self.engine.connect() as conn:
            trans = conn.begin()
            try:
                update_heart_beat_sql = """
                              UPDATE {table}
                              SET last_beat_at = NOW() 
                              WHERE data_center_id = :data_center_id AND worker_id = :worker_id
                              """
                conn.execute(
                    self.schema_sql.get_sql("snowflake_workers", update_heart_beat_sql),
                    {
                        "locked": 1,
                        "data_center_id": self.data_center_id,
                        "worker_id": self.worker
                    })
                trans.commit()
                self.last_heartbeat_timestamp = time()
            except Exception as e:
                trans.rollback()
                getLogger(__name__).error(e, exc_info=True, stack_info=True)


    def heart_beat(self):
        try:
            while True:
                self.update_last_heart_beat()
                sleep(self.heart_beat_interval)
        except Exception as e:
            getLogger(__name__).error(e, exc_info=True, stack_info=True)
            sleep(5)
            self.heart_beat()

    def try_create_worker(self):
        self.worker = self.get_snowflake_worker_id()
        if self.worker != -1:
            Thread(target=SnowflakeWorker.heart_beat, args=(self,), daemon=True).start()
        else:
            raise WorkerIdAllocateFailedError()


    def release_worker(self):
        with self.engine.connect() as conn:
            trans = conn.begin()
            try:
                release_sql = """
                               UPDATE {table}
                               SET locked = :locked
                               WHERE data_center_id = :data_center_id AND worker_id = :worker_id
                               """
                conn.execute(
                    self.schema_sql.get_sql("snowflake_workers", release_sql),
                    {
                        "locked": 0,
                        "data_center_id": self.data_center_id,
                        "worker_id": self.worker
                    }
                )
                trans.commit()
            except Exception as e:
                trans.rollback()
                getLogger(__name__).error(e, exc_info=True, stack_info=True)
    
    def generate(self) -> int:
        """
        generate snowflake worker id
        """
        return self.relet_worker()
    
    def relet_worker(self) -> int:
        if self.worker == -1:
            return self.get_snowflake_worker_id()
        current_timestamp = time()
        time_since_last_heartbeat = current_timestamp - self.last_heartbeat_timestamp
        if time_since_last_heartbeat > self.heart_beat_interval:
            new_worker_id = self.get_snowflake_worker_id()
            if new_worker_id != -1:
                self.worker = new_worker_id
                self.last_heartbeat_timestamp = time()
                return new_worker_id
            else:
                self.worker = -1
                return -1
        else:
            return self.worker