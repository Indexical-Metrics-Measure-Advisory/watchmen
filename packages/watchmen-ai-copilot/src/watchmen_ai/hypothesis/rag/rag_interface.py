
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class ReportHistoryRepository(ABC):
    """
    api for report history repository
    """

    @abstractmethod
    def get_report_history(self, message: str) -> List[Dict[str, Any]]:
        """
        find report history by message in vector database
        :param message:  input message
        :return: history of generated reports
        """
        pass






