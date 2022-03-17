from unittest import TestCase

from sqlalchemy import create_engine
from sqlalchemy.schema import MetaData, Table
from sqlalchemy.sql.expression import select, text


class TestTrino(TestCase):
	def test_trino(self):
		engine = create_engine('trino://admin@localhost:5678')
		connection = engine.connect()

		# rows = connection.execute(text("SELECT * FROM system.nodes.users")).fetchall()
		rows = connection.execute(text('show catalogs')).fetchall()
		print(rows)

		rows = connection.execute(text('select * from test.watchmen.users')).fetchall()
		print(rows)

		# # or using SQLAlchemy schema
		# nodes = Table(
		# 	'users',
		# 	MetaData(schema='watchmen'),
		# 	autoload=True,
		# 	autoload_with=engine
		# )
		# rows = connection.execute(select(nodes)).fetchall()
		# print(f'Get:[{rows}]')
