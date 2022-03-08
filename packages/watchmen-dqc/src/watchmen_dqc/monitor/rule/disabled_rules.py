from typing import List

from watchmen_model.dqc import MonitorRuleCode

disabled_rules: List[MonitorRuleCode] = [
	MonitorRuleCode.RAW_MISMATCH_STRUCTURE,  # ignored now
	MonitorRuleCode.FACTOR_MISMATCH_DATE_TYPE,  # should be detected on pipeline run
	MonitorRuleCode.FACTOR_USE_CAST,  # should be detected on pipeline run
	MonitorRuleCode.FACTOR_BREAKS_MONOTONE_INCREASING,  # ignored now
	MonitorRuleCode.FACTOR_BREAKS_MONOTONE_DECREASING  # ignored now
]
