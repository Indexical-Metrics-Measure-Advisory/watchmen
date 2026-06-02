from typing import Any, Dict, List, Optional

from watchmen_utilities import ExtendedBaseModel


class CanalMessage(ExtendedBaseModel):
	database: Optional[str] = None
	table: Optional[str] = None
	type: Optional[str] = None
	ts: Optional[int] = None
	sql: Optional[str] = None
	id: Optional[int] = None
	isDdl: Optional[bool] = False
	mysqlType: Optional[Dict[str, str]] = None
	data: Optional[List[Dict[str, Any]]] = None
	old: Optional[List[Dict[str, Any]]] = None


OP_INSERT = 'INSERT'
OP_UPDATE = 'UPDATE'
OP_DELETE = 'DELETE'


def parse_operation_type(msg_type: Optional[str]) -> str:
	if msg_type is None:
		return OP_INSERT
	upper = msg_type.upper()
	if upper in (OP_INSERT, 'I'):
		return OP_INSERT
	elif upper in (OP_UPDATE, 'U'):
		return OP_UPDATE
	elif upper in (OP_DELETE, 'D'):
		return OP_DELETE
	return OP_INSERT


def extract_rows_from_canal(message: CanalMessage) -> List[Dict[str, Any]]:
	if message.isDdl:
		return []
	if not message.data:
		return []

	op = parse_operation_type(message.type)
	rows: List[Dict[str, Any]] = []

	for i, data_row in enumerate(message.data):
		row: Dict[str, Any] = {
			'_table': message.table,
			'_op': op,
			'_binlog_id': message.id or 0,
			'_ts': message.ts,
			'_seq': i,
		}

		if op == OP_DELETE:
			if message.old and i < len(message.old) and message.old[i]:
				row.update(message.old[i])
			else:
				row.update(data_row)
		else:
			row.update(data_row)

		rows.append(row)

	return rows
