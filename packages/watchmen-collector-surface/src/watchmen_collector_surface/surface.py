from .settings import ask_integrated_record_collector_enabled
from watchmen_collector_surface.connects import init_collector_integrated_record


class CollectorSurface:

	def __init__(self):
		pass

	# noinspection PyMethodMayBeStatic
	def init_integrated_record_collector(self) -> None:
		if ask_integrated_record_collector_enabled():
			init_collector_integrated_record()

	def init(self) -> None:
		self.init_integrated_record_collector()


collector_surface = CollectorSurface()
