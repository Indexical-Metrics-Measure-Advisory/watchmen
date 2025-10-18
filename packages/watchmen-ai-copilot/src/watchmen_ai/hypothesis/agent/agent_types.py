from enum import Enum


class IntentType(Enum):
    """User intent types"""
    GENERAL_CHAT = "general_chat"
    DATA_ANALYSIS = "data_analysis"
    REPORT_GENERATION = "report_generation"
    METRIC_QUERY = "metric_query"