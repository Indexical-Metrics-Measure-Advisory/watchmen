from typing import Dict, List, Any

from watchmen_ai.hypothesis.rag.rag_interface import ReportHistoryRepository


class LanceDBReportHistoryRepository(ReportHistoryRepository):
    """
    基于 lancedb 的报表历史记录实现（mock 数据）
    """

    def get_report_history(self, context: str) -> List[Dict[str, Any]]:
        # mock 数据
        return [
            {
                "report_id": "rpt_001",

                "title": "销售报表-2024年Q1",
                "created_at": "2024-04-01 10:00:00",
                "status": "已生成"
            },
            {
                "report_id": "rpt_002",

                "title": "库存报表-2024年Q1",
                "created_at": "2024-04-10 15:30:00",
                "status": "已生成"
            }
        ]






