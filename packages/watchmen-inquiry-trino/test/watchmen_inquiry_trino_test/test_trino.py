from unittest import TestCase

from trino.dbapi import connect


class TestTrino(TestCase):
	# noinspection SqlResolve,SqlCaseVsIf
	def test_trino(self):
		conn = connect(
			host='localhost',
			port=5678,
			user='admin',
			# catalog="<catalog>",
			# schema="<schema>",
		)
		cur = conn.cursor()
		# noinspection SqlIdentifier
		cur.execute('SELECT * FROM system.runtime.nodes')
		rows = cur.fetchall()
		# print(rows)
		cur.execute('show catalogs')
		rows = cur.fetchall()
		# print(rows)

		# '''1' as X,
		# false as X,
		# parse_datetime('2021112019:46:38', 'yyyyMMddHH:mm:ss') AS X
		# CAST('123' AS DECIMAL) AS X
		# date_diff('day', DATE '2020-03-04', DATE '2020-03-02') + 1 AS X
		cur.execute(
			"SELECT COLUMN_1, "
			"date_diff('day', DATE '2020-03-02', DATE '2020-03-02') AS X "
			"FROM ("
			"   SELECT USER_ID AS COLUMN_1 FROM test.watchmen.users "
			"   WHERE CASE WHEN user_id != '1' THEN 'X' ELSE 'Y' END = 'X'"
			") as u")
		rows = cur.fetchall()
		# print(rows)
