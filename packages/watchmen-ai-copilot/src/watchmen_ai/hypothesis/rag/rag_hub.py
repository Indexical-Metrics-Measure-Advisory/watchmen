from watchmen_ai.hypothesis.rag.external.lancedb_servcie import LanceDBReportHistoryRepository
from watchmen_ai.hypothesis.rag.rag_interface import ReportHistoryRepository


class ReportHistoryRepositoryFactory:
    """
    报表历史记录仓库工厂类（单例模式）
    """
    _instance = None
    _repository = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ReportHistoryRepositoryFactory, cls).__new__(cls)
            # 默认使用 LanceDB 实现
            cls._repository = LanceDBReportHistoryRepository()
        return cls._instance

    @classmethod
    def get_repository(cls) -> ReportHistoryRepository:
        """
        获取报表历史记录仓库实例
        :return: ReportHistoryRepository 实例
        """
        if cls._instance is None:
            cls._instance = ReportHistoryRepositoryFactory()
        return cls._repository

    @classmethod
    def set_repository(cls, repository: ReportHistoryRepository) -> None:
        """
        设置报表历史记录仓库实例（用于测试或切换实现）
        :param repository: 报表历史记录仓库实例
        """
        if cls._instance is None:
            cls._instance = ReportHistoryRepositoryFactory()
        cls._repository = repository

# 使用示例
# repo = ReportHistoryRepositoryFactory.get_repository()
# history = repo.get_report_history("user123")


vector_repository = ReportHistoryRepositoryFactory.get_repository()