from .log_data_source_cache import LogDataSourceCache, log_datasource_cache



class LambdaCacheService:

	@staticmethod
	def log_data_source() -> LogDataSourceCache:
		return log_datasource_cache

	
	@staticmethod
	def clear_all() -> None:
		LambdaCacheService.log_data_source().clear()
		
