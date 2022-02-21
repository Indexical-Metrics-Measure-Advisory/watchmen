from .external_writer import CreateExternalWriter, ExternalWriter, ExternalWriterParams


class ElasticSearchExternalWriter(ExternalWriter):
	# noinspection PyMethodMayBeStatic
	async def do_run(self, params: ExternalWriterParams) -> None:
		# TODO elastic search external writer
		pass

	def run(self, params: ExternalWriterParams) -> bool:
		self.do_run(params)
		return True


def create_elastic_search_writer(code: str) -> ElasticSearchExternalWriter:
	return ElasticSearchExternalWriter(code)


def register_elastic_search_writer() -> CreateExternalWriter:
	return create_elastic_search_writer
