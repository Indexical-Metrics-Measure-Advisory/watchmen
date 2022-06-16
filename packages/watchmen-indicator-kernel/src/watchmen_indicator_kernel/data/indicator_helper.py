from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.meta import IndicatorService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import IndicatorId
from watchmen_model.indicator import Indicator
from watchmen_utilities import is_blank


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
	return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# noinspection DuplicatedCode
def ask_indicator(indicator_id: Optional[IndicatorId], principal_service: PrincipalService) -> Indicator:
	if is_blank(indicator_id):
		raise IndicatorKernelException('Indicator not declared.')
	indicator_service = get_indicator_service(principal_service)
	indicator_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		indicator: Indicator = indicator_service.find_by_id(indicator_id)
		if indicator is None:
			raise IndicatorKernelException(f'Indicator[id={indicator_id}] not found.')
		if indicator.tenantId != principal_service.get_tenant_id():
			raise IndicatorKernelException(f'Indicator[id={indicator_id}] not found.')
		return indicator
	finally:
		indicator_service.close_transaction()
