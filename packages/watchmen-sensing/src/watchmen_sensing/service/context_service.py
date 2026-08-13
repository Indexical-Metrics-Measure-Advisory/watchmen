from watchmen_indicator_surface.util import trans_readonly

from watchmen_sensing.common.exception import SignalNotFoundException
from watchmen_sensing.engine.context_engine import ContextEngine
from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.model.context import SignalContext


class ContextService:
	"""Builds and returns the SignalContext for a given signal (context router)."""

	def __init__(self, signal_service: SignalService, adapters: AdapterBundle):
		self.signal_service = signal_service
		self.engine = ContextEngine(adapters)

	def build_for(self, signal_id: str, tenant_id: str = None) -> SignalContext:
		signal = trans_readonly(
			self.signal_service, lambda: self.signal_service.find_by_id(signal_id, tenant_id))
		if signal is None:
			raise SignalNotFoundException(f'Signal[{signal_id}] not found.')
		# ContextEngine.build reads history via the signal service; keep it inside
		# a read transaction.
		return trans_readonly(
			self.signal_service,
			lambda: self.engine.build(signal, self.signal_service))
