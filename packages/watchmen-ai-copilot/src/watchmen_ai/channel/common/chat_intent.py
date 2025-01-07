from enum import Enum


class MainIntent(str, Enum):
    """
    Main intent of the user.
    """

    analysis_objective = "analysis_objective"
    analysis_metric = "analysis metric"
    customize_report = "customize_report"
