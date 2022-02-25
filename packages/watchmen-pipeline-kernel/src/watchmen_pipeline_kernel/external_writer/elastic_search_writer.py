from watchmen_data_kernel.external_writer import BuildExternalWriter, ExternalWriter, ExternalWriterParams


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


def register_elastic_search_writer() -> BuildExternalWriter:
	return create_elastic_search_writer
