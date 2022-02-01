from unittest import TestCase

from watchmen_rest_doll.util import crypt_password


class CreateSuperAdmin(TestCase):
	def test_create(self):
		print(crypt_password('change-me'))
