from abc import ABC, abstractmethod

from watchmen_auth import PrincipalService


class LineageBuilder(ABC):

	# @abstractmethod
	# def load(self,data)->List:
	# 	pass

	@abstractmethod
	def build(self, graphic, principal_service: PrincipalService):
		pass
