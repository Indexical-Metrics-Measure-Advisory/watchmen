from logging import getLogger
from typing import Dict, List

from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.admin import Factor
from watchmen_model.common import FactorId
from watchmen_model.dqc import MonitorRule
from watchmen_utilities import ArrayHelper, is_blank
from .data_service_utils import find_factor

logger = getLogger(__name__)


def group_rules_by_factor(rules: List[MonitorRule]) -> Dict[FactorId, List[MonitorRule]]:
	return ArrayHelper(rules).group_by(lambda x: x.factorId)


def find_factors_and_log_missed(
		data_service: TopicDataService,
		rules_by_factor: Dict[FactorId, List[MonitorRule]]) -> List[Factor]:
	factors = ArrayHelper(list(rules_by_factor.keys())) \
		.map(lambda x: find_factor(data_service, x, rules_by_factor[x][0])).to_list()

	def factor_not_found(factor_id: FactorId) -> bool:
		return ArrayHelper(factors).every(lambda x: x.factorId != factor_id)

	def logger_error(factor_id: FactorId) -> None:
		ignored_rules = rules_by_factor.get(factor_id)
		if ignored_rules is None or len(ignored_rules) == 1:
			# first rule already logged when find factor
			return
		for rule in ignored_rules:
			if is_blank(factor_id):
				logger.error(f'Factor id not declared on rule[{rule.dict()}].')
			else:
				logger.error(f'Factor[id={factor_id}] on rule[{rule.dict()}] not found.')

	ArrayHelper(list(rules_by_factor.keys())).filter(factor_not_found).each(logger_error)

	return factors
