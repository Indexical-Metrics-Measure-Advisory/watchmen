from abc import ABC, abstractmethod
from typing import Dict
import logging


logger = logging.getLogger(__name__)


class SecretsManger(ABC):
	
	@abstractmethod
	def ask_secrets(self, secret_id) -> Dict:
		pass
