from typing import Optional

from watchmen_sensing.common.exception import IllegalSignalTransitionException
from watchmen_sensing.model.signal import SignalStatus


# Signal lifecycle in order (section 28).
ORDERED_STATUSES = [
	SignalStatus.DETECTED,
	SignalStatus.ENRICHED,
	SignalStatus.CLASSIFIED,
	SignalStatus.CORRELATED,
	SignalStatus.IMPACT_ANALYZED,
	SignalStatus.ACTION_PLANNED,
	SignalStatus.ACTION_EXECUTED,
	SignalStatus.VERIFIED,
	SignalStatus.RESOLVED,
]


def next_status(current: SignalStatus) -> Optional[SignalStatus]:
	"""Return the next status in the lifecycle, or None if already resolved."""
	try:
		index = ORDERED_STATUSES.index(current)
	except ValueError:
		return None
	if index >= len(ORDERED_STATUSES) - 1:
		return None
	return ORDERED_STATUSES[index + 1]


def can_transition(current: SignalStatus, target: SignalStatus) -> bool:
	"""A transition is legal only to the immediate next status (or staying put)."""
	if current == target:
		return True
	return next_status(current) == target


def assert_transition(current: SignalStatus, target: SignalStatus) -> None:
	if not can_transition(current, target):
		raise IllegalSignalTransitionException(
			f'Illegal signal transition: {current} -> {target}')


def advance(current: SignalStatus, *targets: SignalStatus) -> SignalStatus:
	"""Advance through a chain of adjacent statuses, enforcing the transition guard."""
	for target in targets:
		assert_transition(current, target)
		current = target
	return current
