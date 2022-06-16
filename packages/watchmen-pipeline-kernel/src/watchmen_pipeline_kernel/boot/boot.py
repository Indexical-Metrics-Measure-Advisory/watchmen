from watchmen_pipeline_kernel.common.settings import ask_elastic_search_writer_enabled, \
	ask_standard_external_writer_enabled
from watchmen_pipeline_kernel.external_writer import register_elastic_search_external_writer, \
	register_standard_external_writer
from watchmen_pipeline_kernel.topic_snapshot import create_periodic_topic_snapshot_jobs


def init_prebuilt_external_writers() -> None:
	if ask_standard_external_writer_enabled():
		register_standard_external_writer()
	if ask_elastic_search_writer_enabled():
		register_elastic_search_external_writer()


def init_topic_snapshot_jobs() -> None:
	create_periodic_topic_snapshot_jobs()
