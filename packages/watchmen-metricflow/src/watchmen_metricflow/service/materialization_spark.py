from watchmen_metricflow.settings import ask_materialization_spark_submit_command

from .materialization_error import MaterializationError


def is_spark_configured() -> bool:
	return len(ask_materialization_spark_submit_command()) > 0


def offload_to_spark_submit(*args, **kwargs) -> None:
	"""
	P1 scaffold: the spark-submit driver job (metric query + write back running
	on the cluster, credentials distributed via --files env only) is not shipped
	yet. Callers fall back to the storage engine when spark is not configured
	and fail explicitly when it is, so a configured engine never silently
	computes on another engine.
	"""
	if not is_spark_configured():
		raise MaterializationError('Spark engine is not configured.')
	raise MaterializationError('Spark offload is not available in this build.')
