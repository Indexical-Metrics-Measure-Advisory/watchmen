from watchmen_model.webhook.event_defination import EventSource
from watchmen_webhook_server.data.indicators_loader import IndicatorDataLoader
from watchmen_webhook_server.data.subject_loader import SubjectDataLoader


def build_data_Loader(event_source: EventSource):
	if EventSource.OBJECTIVE_ANALYSIS == event_source:
		return IndicatorDataLoader()
	elif EventSource.SUBJECT == event_source:
		return SubjectDataLoader()
	else:
		raise Exception("Event source is not correct")
