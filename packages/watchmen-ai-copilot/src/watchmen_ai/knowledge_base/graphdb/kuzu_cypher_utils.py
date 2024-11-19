from enum import Enum
from typing import Dict, Any


class KuzuColumnTypes(str, Enum):
    STRING = "STRING"
    DATE = "DATE"
    INT64 = "INT64"
    DECIMAL = "DECIMAL"
    BOOLEAN = "BOOLEAN"
    TIMESTAMP = "TIMESTAMP"
    INTERVAL = "INTERVAL"


def convert_to_kuzu_type(data_type):
    if data_type == "string":
        return KuzuColumnTypes.STRING
    if data_type == "date":
        return KuzuColumnTypes.DATE
    if data_type == "int64":
        return KuzuColumnTypes.INT64
    if data_type == "decimal":
        return KuzuColumnTypes.DECIMAL
    else:

        return KuzuColumnTypes.STRING


def build_create_node_table(table_name, columns):
    """
    build_create_table
    :param table_name:
    :param columns:
    :return:
    """
    primary_key = None
    column_str = ""
    for column in columns:
        if "primary_key" in column and column["primary_key"]:
            primary_key = column["name"]

        column_str += f"{column['name']} {column['type']},"
    column_str = column_str[:-1]

    return f"CREATE NODE TABLE IF NOT EXISTS {table_name} ({column_str},PRIMARY KEY({primary_key}))"


def build_create_edge_table(table_name, source, target, columns):
    """
    build_create_edge_table
    :param table_name:
    :param source:
    :param target:
    :param columns:
    :return:
    """
    column_str = ""
    for column in columns:
        column_str += f"{column['name']} {column['type']},"
    column_str = column_str[:-1]
    return f"CREATE REL TABLE  IF NOT EXISTS {table_name}(FROM {source} TO {target},{column_str})"


def build_insert_node(table_name, columns_dict: Dict[str, Any]):
    columns_sql = ""
    for key, value in columns_dict.items():
        columns_sql += f"{key} : '{value}',"
    columns_sql = columns_sql[:-1]
    return f"MERGE (u:{table_name} {{{columns_sql}}})"


def build_insert_edge(ref_table, source, target, source_id, target_id, columns_dict: Dict[str, Any]):
    columns_sql = ""
    for key, value in columns_dict.items():
        columns_sql += f"{key} : '{value}',"
    columns_sql = columns_sql[:-1]
    return f"MATCH (u1:{source}), (u2:{target}) WHERE u1.node_id = '{source_id}' AND u2.node_id = '{target_id}' CREATE (u1)-[:{ref_table} {{{columns_sql}}}]->(u2)"


if __name__ == "__main__":
    table_name = "test"
    columns = {"name": "go to name "}

    # "MATCH (u1:BusinessTarget), (u2:Metric) WHERE u1.node_id = '13' AND u2.node_id = 'dada' CREATE (u1)-[:measured_metric {since: 2011}]->(u2)"

    # CREATE TABLE test (id int,name varchar(255),age int)
