from abc import ABC
from langchain_core.language_models import BaseLanguageModel
from pydantic import BaseModel
from typing import Dict, Optional, Any

from langchain_core.runnables import RunnableConfig


class TaskContext(BaseModel):
    session_id: Optional[str] = None


class BaseAction(ABC):
    """Base class for all actions"""

    # @abstractmethod
    def run(self, data: Any, ai_model: BaseLanguageModel):
        """
        Run the action
        :param ai_model:
        :param data:
        :return:
        """
        pass

    # @abstractmethod
    def describe(self):
        """Describe the action"""
        pass

    def get_run_config(self, cb):
        if cb:
            return RunnableConfig(callbacks=[cb])
        else:
            return RunnableConfig()
#

# class Action(ABC):
#
