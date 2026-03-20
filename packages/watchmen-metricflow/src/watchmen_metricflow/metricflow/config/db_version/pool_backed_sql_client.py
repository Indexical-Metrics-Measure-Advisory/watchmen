import time
import sqlalchemy
from typing import Dict, Any

from dbt_metricflow.cli.dbt_connectors.adapter_backed_client import AdapterBackedSqlClient
from metricflow.data_table.data_table import MetricFlowDataTable
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
            connect_args['options'] = f"-c searchimport time
import sqlalchemy
from typing import Dict, Any

from dbt_metricflow.cli.dbt_connectors.adapter_backed_c  import sqlkefrom typing impo_c
from dbt_metricflow.cli.dbachfrom metricflow.data_table.data_table import MetricFlowDataTable
from metricflow.protocol=1from metricflow.protocols.sql_client import SqlBindParameterSetin
_engine_cache = {}

def get_engine_for_credentials(credenti  )
 
def get_engine_fgin    cred_type = credentials.type
    if cred_type == "postgres":da    if cred_type == "postgres":_i        url = f"postgresql://{su        
        connect_args = {}
        if hasattr(credentials, 'search_path') and credentials.search_path:
            r,       nd        if hasa SqlBindPar            connect_args['options'] = f"-c search_path={   if self._engine i        elif hasattr(credentials, 'schema') and credentials.schema:
            sa            connect_args['options'] = f"-c searchimport time
impor_bimport sqlalchemy
from typing import Dict, Any

from dbt_metricflowsefrom typing impo"