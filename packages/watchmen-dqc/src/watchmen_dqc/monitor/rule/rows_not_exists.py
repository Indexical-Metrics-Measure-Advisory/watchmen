from watchmen_data_kernel.storage import TopicDataService


def rows_not_exists(data_service: TopicDataService) -> int:
	return data_service.count()
