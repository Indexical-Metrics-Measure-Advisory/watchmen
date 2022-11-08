from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.storage import SubjectDataService
from watchmen_inquiry_surface.data.data_router import get_subject_service
from watchmen_model.common import SubjectId, Pageable
from watchmen_model.console import Subject
from watchmen_model.webhook.event_defination import EventSource
from watchmen_webhook_server.data.event_data_loader import EventDataLoader


class SubjectDataLoader(EventDataLoader):

	@staticmethod
	def __is_subject_event_source(event_source: EventSource) -> bool:
		return EventSource.SUBJECT == event_source

	def load_data_from_event_sources(self, event_source: EventSource, source_id: str,
	                                 tenant_principal_service: PrincipalService):
		if not self.__is_subject_event_source(self, event_source):
			raise ValueError("event_source is not a valid EventSource in subject_loader service")
		else:
			# load data in api
			subject_id: SubjectId = source_id
			subject: Optional[Subject] = get_subject_service(tenant_principal_service).find_by_id(subject_id)

			# TODO get max size for data

			subject_data = SubjectDataService(subject, tenant_principal_service).page(
				Pageable(pageNumber=1, pageSize=100))

			return subject_data
