from datetime import date

from watchmen_auth import PrincipalService
from watchmen_data_kernel.topic_schema import TopicSchema


class TopicRulesRunner:
	def __init__(self, schema: TopicSchema, principal_service: PrincipalService):
		self.schema = schema
		self.principalService = principal_service

	def run(self, process_date: date):
		# TODO
		pass
