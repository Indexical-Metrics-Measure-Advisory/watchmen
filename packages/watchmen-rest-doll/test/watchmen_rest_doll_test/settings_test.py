from unittest import TestCase

from watchmen_rest import RestSettings


class DollSettings(RestSettings):
	APP_NAME: str = ''


class FirstTest(TestCase):
	def test_one(self):
		x = DollSettings()
		print(x.APP_NAME)
		print(x.DESCRIPTION)
