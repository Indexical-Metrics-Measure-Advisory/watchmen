from watchmen_data_kernel.external_writer import CreateExternalWriterBuilder, register_external_writer_create
from watchmen_model.system import ExternalWriterType


def find_standard() -> CreateExternalWriterBuilder:
	from .standard_writer import register_standard_writer
	return register_standard_writer


def register_standard_external_writer() -> None:
	register_external_writer_create(ExternalWriterType.STANDARD_WRITER, find_standard())


def find_elastic_search() -> CreateExternalWriterBuilder:
	from .elastic_search_writer import register_elastic_search_writer
	return register_elastic_search_writer


def register_elastic_search_external_writer() -> None:
	register_external_writer_create(ExternalWriterType.ELASTIC_SEARCH_WRITER, find_elastic_search())
