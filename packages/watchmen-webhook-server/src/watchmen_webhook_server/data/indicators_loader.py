from watchmen_auth import PrincipalService
from watchmen_model.webhook.event_defination import EventSource
from watchmen_webhook_server.data.event_data_loader import EventDataLoader


class IndicatorDataLoader(EventDataLoader):

	def load_data_from_event_sources(self, event_source: EventSource, source_id: str,
	                                 tenant_principal_service: PrincipalService):
		if EventSource.OBJECTIVE_ANALYSIS != event_source:
			raise Exception('EventSource is not objective analysis')

		return {"mock": "data"}
