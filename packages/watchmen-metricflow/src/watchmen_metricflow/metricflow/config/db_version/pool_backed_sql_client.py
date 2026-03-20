import time
import sqlalchemy
from typing import Dict, Any

from dbt_metricflow.cli.dbt_connectors.adapter_backed_client import AdapterBackedSqlClient
from metricflow.data_table.mf_table import MetricFlowDataTable
from metricflow.protocols.sql_client import SqlBindParameterSet

_engine_cache = {}

def get_engine_for_credentials(credentials) -> sqlalchemy.Engine:
    cred_type = credentials.type
    if cred_type == "postgres":
        url = f"postgresql://{credentials.user}:{credentials.password}@{credentials.host}:{credentials.port}/{credentials.database}"
        
        connect_args = {}
        if hasattr(credentials, 'search_path') and credentials.search_path:
            connect_args['options'] = f"-c search_path={credentials.search_path}"
        elif hasattr(credentials, 'schema') and credentials.schema:
            connect_args['options'] = f"-c search_path={credentials.schema}"

        engine_key = f"{url}_{connect_args.get('options', '')}"
        if engine_key not in _engine_cache:
            _engine_cache[engine_key] = sqlalchemy.create_engine(
                url, 
                pool_size=10, 
                max_overflow=20,
                pool_pre_ping=True,
                connect_args=connect_args
            )
        return _engine_cache[engine_key]
    return None

class PoolBackedSqlClient(AdapterBackedSqlClient):
    def __init__(self, adapter):
        super().__init__(adapter)
        self._engine = get_engine_for_credentials(adapter.config.credentials)

    def query(self, stmt: str, sql_bind_parameter_set: SqlBindParameterSet = SqlBindParameterSet()) -> MetricFlowDataTable:
        if self._engine is None:
            # Fallback to dbt adapter behavior and try to commit to prevent transaction leak
            try:
                return super().query(stmt, sql_bind_parameter_set)
            finally:
                if hasattr(self._adapter, 'connections') and hasattr(self._adapter.connections, 'commit_if_has_connection'):
                    self._adapter.connections.commit_if_has_connection()

        if sql_bind_parameter_set.param_dict:
            raise Exception("SqlBindParameterSet not supported")

        start = time.perf_counter()
        
        with self._engine.connect() as conn:
            result = conn.execute(sqlalchemy.text(stmt))
            columns = list(result.keys())
            rows = [list(row) for row in result.fetchall()]

        data_table = MetricFlowDataTable.create_from_rows(
            column_names=columns,
            rows=rows,
        )
        
        return data_table
        
    def execute(self, stmt: str, sql_bind_parameter_set: SqlBindParameterSet = SqlBindParameterSet()) -> None:
        if self._engine is None:
            return super().execute(stmt, sql_bind_parameter_set)
            
        with self._engine.begin() as conn:
            conn.execute(sqlalchemy.text(stmt))
