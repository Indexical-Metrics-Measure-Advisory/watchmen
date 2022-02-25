from watchmen_data_kernel.external_writer import CreateExternalWriterBuilder
from watchmen_reactor.common import ask_elastic_search_external_writer_enabled, ask_standard_external_writer_enabled, \
	ReactorException


def find_standard() -> CreateExternalWriterBuilder:
	if ask_standard_external_writer_enabled():
		from .standard_writer import register_standard_writer
		return register_standard_writer
	else:
		raise ReactorException(f'Standard external writer is turned off now.')


def find_elastic_search() -> CreateExternalWriterBuilder:
	if ask_elastic_search_external_writer_enabled():
		from .elastic_search_writer import register_elastic_search_writer
		return register_elastic_search_writer
	else:
		raise ReactorException(f'Elastic search external writer is turned off now.')
