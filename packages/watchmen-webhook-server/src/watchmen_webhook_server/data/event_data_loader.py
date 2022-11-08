from abc import ABC, abstractmethod

from watchmen_auth import PrincipalService
from watchmen_model.webhook.event_defination import EventSource


class EventDataLoader(ABC):

	@abstractmethod
	def load_data_from_event_sources(self, event_source: EventSource, source_id: str,
	                                 tenant_principal_service: PrincipalService):
		pass
