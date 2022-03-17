from unittest import TestCase

from trino.dbapi import connect


class TestTrino(TestCase):
	def test_trino(self):
		conn = connect(
			host='localhost',
			port=5678,
			user='admin',
			# catalog="<catalog>",
			# schema="<schema>",
		)
		cur = conn.cursor()
		cur.execute('SELECT * FROM system.runtime.nodes')
		rows = cur.fetchall()
		print(rows)
		cur.execute('show catalogs')
		rows = cur.fetchall()
		print(rows)

		cur.execute('select * from test.watchmen.users')
		rows = cur.fetchall()
		print(rows)
