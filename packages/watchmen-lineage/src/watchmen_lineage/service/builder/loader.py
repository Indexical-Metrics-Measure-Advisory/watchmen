from abc import ABC, abstractmethod

from pydantic import BaseModel

from watchmen_auth import PrincipalService


class LineageBuilder(ABC):

	# @abstractmethod
	# def load(self,storage)->List:
	# 	pass

	@abstractmethod
	def build(self, graphic, principal_service: PrincipalService):
		pass

	@abstractmethod
	def build_partial(self,graphic, data:BaseModel ,principal_service:PrincipalService):
		pass

