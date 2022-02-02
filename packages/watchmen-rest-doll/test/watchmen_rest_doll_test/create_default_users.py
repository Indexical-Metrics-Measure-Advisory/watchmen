from unittest import TestCase

from watchmen_rest_doll.util import crypt_password


class CreateDefaultUsers(TestCase):
	def test_create(self):
		# for imma-super
		print(f'imma-super[{crypt_password("change-me")}]')
		# for imma-admin
		print(f'imma-admin[{crypt_password("1234abcd")}]')
		# for imma-user
		print(f'imma-user[{crypt_password("1234abcd")}]')
