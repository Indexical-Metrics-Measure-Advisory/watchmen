from abc import ABC, abstractmethod

from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import LineageNode


class LineageBuilder(ABC):

	@abstractmethod
	def build(self, graphic, principal_service: PrincipalService):
		pass

	@abstractmethod
	def build_partial(self, graphic, data: BaseModel, principal_service: PrincipalService):
		pass

	@abstractmethod
	def load_one(self, principal_service, lineage_node: LineageNode):
		pass

	@abstractmethod
	def add_cid(self, model: BaseModel, lineage_node: LineageNode):
		pass
