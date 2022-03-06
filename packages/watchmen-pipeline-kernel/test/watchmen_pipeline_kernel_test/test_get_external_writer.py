from unittest import TestCase

from watchmen_data_kernel.external_writer import ask_external_writer_creator, find_external_writer_create, \
	register_external_writer_creator
from watchmen_model.system import ExternalWriterType
from watchmen_pipeline_kernel.boot import init_prebuilt_external_writers


class GetExternalWriter(TestCase):
	# noinspection PyMethodMayBeStatic
	def test_get_external_writer(self):
		init_prebuilt_external_writers()
		create = find_external_writer_create(ExternalWriterType.STANDARD_WRITER)
		print(create)
		register_external_writer_creator('x', create())
		x = ask_external_writer_creator('x')
		print(x)
