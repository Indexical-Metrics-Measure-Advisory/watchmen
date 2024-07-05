from abc import ABC
from langchain_core.language_models import BaseLanguageModel
from typing import Dict

from langchain_core.runnables import RunnableConfig


class BaseAction(ABC):
    """Base class for all actions"""



    # @abstractmethod
    async def run(self, context: Dict,ai_model:BaseLanguageModel):
        """
        Run the action
        :param ai_model:
        :param context:
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
