from typing import Sequence, Dict, List, Optional

from sqlalchemy import Engine

from .storage_oracle import StorageOracle


class TopicDataStorageOracleBatchWriter(StorageOracle):
    
    def __init__(self, engine: Engine, batch_size: int = 500):
        super().__init__(engine)
        self.engine = engine
        self.batch_size = batch_size
    
    def write(
            self,
            table: str,
            pk: Sequence[str],
            columns: Sequence[str],
            records: List[Dict[str, object]],
    ) -> Optional[List[Dict]]:
        """
        Write a batch of records to Oracle using MERGE + executemany.
        
        - On batch-level Oracle error: raise
        - On row-level error: capture into self.last_failures
        - Never return "success count"
        """
        sql = merge_sql(table, columns, pk)
        
        with self.engine.connect() as conn:
            raw_conn = conn.connection.dbapi_connection  # DBAPI connection
            cursor = raw_conn.cursor()
        
            failures: List[Dict] = []
    
            try:
                for i in range(0, len(records), self.batch_size):
                    batch = records[i:i + self.batch_size]
                    data = [
                        {c: row.get(c) for c in columns} for row in batch
                    ]
                    
                    cursor.executemany(sql, data, batcherrors=True)  # type: ignore[call-arg]
                    
                    errors = cursor.getbatcherrors()
                    if errors:
                        for err in errors:
                            failures.append({
                                "code": err.code,
                                "message": err.message,
                                "row": batch[err.offset],
                            })
                        
                    conn.commit()
            finally:
                cursor.close()
        
        if failures:
            return failures
        

def merge_sql(table: str, columns: list[str], pk: List[str]) -> str:
    """
    just used in executemany
    """
    cols = list(columns)
    
    on_clause = " AND ".join(
        f"t.{c} = s.{c}" for c in pk
    )
    
    update_set = ",\n    ".join(
        f"t.{c} = s.{c}"
        for c in cols
        if c not in pk
    )

    insert_cols = ", ".join(cols)
    insert_vals = ", ".join(f"s.{c}" for c in cols)

    return f"""
MERGE /*+ INDEX(t ({','.join(pk)})) */ INTO {table} t
USING (
    SELECT
        {", ".join(f":{c} AS {c}" for c in cols)}
    FROM dual
) s
ON ({on_clause})
WHEN MATCHED THEN
    UPDATE SET
        {update_set}
WHEN NOT MATCHED THEN
    INSERT ({insert_cols})
    VALUES ({insert_vals})
"""