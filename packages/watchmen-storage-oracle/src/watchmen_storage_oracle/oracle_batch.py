from typing import Sequence, Dict, List, Optional
from typing import Sequence, List, Optional, Tuple
from sqlalchemy import Engine, text


class CollectorBatchStorageOracle:
    def __init__(
        self,
        engine: Engine
    ):
        """
        :param engine: sqlalchemy engine instance
        :param table_name: target table name
        :param pk_columns: primary key column list, support composite key
        :param shard_step_rows: expected row count for each logical shard
        """
        self.engine = engine
        

    def get_shard_split_points(self, table_name: str, pk_columns: List[str], shard_step_rows: int, cursor: Optional[Tuple]) -> Optional[Tuple]:
        """
        Sample primary keys to get next shard split point for ONE single shard step.
        Shard range semantic: (prev_split, current_split].
        :param cursor: previous split point tuple; None means start from first record.
        :return: next split‑point tuple, return None if reach end of table.
        """
        pk_col_str = ", ".join(pk_columns)
        order_by_str = ", ".join(pk_columns)
        step = shard_step_rows
        
        # Dynamically assemble inner where clause for tuple comparison
        if cursor is None:
            where_inner = ""
            bind_params = {}
        else:
            # Build oracle tuple comparison: (col1, col2) > (:v0, :v1)
            col_tuple = f"({pk_col_str})"
            param_names = [f":v{i}" for i in range(len(pk_columns))]
            val_tuple = f"({','.join(param_names)})"
            where_inner = f"WHERE {col_tuple} > {val_tuple}"
            bind_params = {f"v{i}": cursor[i] for i in range(len(pk_columns))}
        
        sql_text = f"""
       SELECT {pk_col_str}
       FROM (
           SELECT {pk_col_str}, ROWNUM AS rn
           FROM (
               SELECT {pk_col_str}
               FROM {table_name}
               {where_inner}
               ORDER BY {order_by_str}
           ) t
           WHERE ROWNUM <= :step
       )
       WHERE rn = :step
           """.strip()
        
        bind_params["step"] = step
        
        with self.engine.connect() as conn:
            result = conn.execute(text(sql_text), bind_params)
            row = result.first()
        
        if row is None:
            # No matched row, reach end of table
            return None
        
        split_tuple = tuple(row)
        return split_tuple


    def build_shard_ranges(self, split_points: List[Tuple]) -> List[Tuple[Optional[Tuple], Optional[Tuple]]]:
        """
        Construct complete shard boundary list from split‑point collection.
        Each item: (lower_bound, upper_bound).
        lower = None means no lower limit; upper = None means no upper limit.
        Query semantic: lower_bound < primary_key <= upper_bound
        """
        ranges = []
        prev: Optional[Tuple] = None
        for sp in split_points:
            ranges.append((prev, sp))
            prev = sp
        # Append last open‑ended shard
        ranges.append((prev, None))
        return ranges
    
    
    def batch_write(
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