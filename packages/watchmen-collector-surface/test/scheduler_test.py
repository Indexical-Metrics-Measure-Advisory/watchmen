import threading
import time
import unittest
from unittest.mock import Mock, patch

from watchmen_collector_surface.scheduler import JobScheduler


class JobSchedulerTest(unittest.TestCase):

	def setUp(self):
		self.scheduler = JobScheduler()
		self.scheduler.event_listener = Mock()
		self.listener_patch = patch('watchmen_collector_surface.scheduler.CollectorEventListener')
		self.listener_class = self.listener_patch.start()
		self.addCleanup(self.listener_patch.stop)
		self.addCleanup(self.shutdown_scheduler)

	def shutdown_scheduler(self):
		if not self.scheduler.pickup_shutdown:
			self.scheduler.shutdown()

	def wait_until(self, predicate):
		deadline = time.monotonic() + 5
		while time.monotonic() < deadline:
			if predicate():
				return
			time.sleep(0.01)
		self.fail('Condition was not met within 5 seconds.')

	def test_same_tenant_nudges_are_coalesced_into_one_wakeup(self):
		listeners = []
		calls = []
		lock = threading.Lock()
		started = threading.Event()
		release = threading.Event()
		active = 0
		max_active = 0

		class Listener:
			def __init__(self):
				self.storage = Mock()
				listeners.append(self)

			def pickup_event(self, tenant_id):
				nonlocal active, max_active
				with lock:
					call_index = len(calls)
					calls.append(tenant_id)
					active += 1
					max_active = max(max_active, active)
				if call_index == 0:
					started.set()
					release.wait(5)
				with lock:
					active -= 1

		self.listener_class.side_effect = Listener
		self.scheduler.try_pickup_event_now('tenant-1')
		self.assertTrue(started.wait(5))
		for _ in range(50):
			self.scheduler.try_pickup_event_now('tenant-1')
		self.assertEqual(1, len(listeners))
		release.set()
		self.wait_until(lambda: not self.scheduler.pickup_running)

		self.assertEqual(['tenant-1', 'tenant-1'], calls)
		self.assertEqual(2, len(listeners))
		self.assertEqual(1, max_active)
		for listener in listeners:
			listener.storage.close.assert_called_once_with()

	def test_different_tenants_use_independent_listeners(self):
		listeners = []
		condition = threading.Condition()
		release = threading.Event()
		started = 0
		active = 0

		class Listener:
			def __init__(self):
				self.storage = Mock()
				with condition:
					listeners.append(self)

			def pickup_event(self, tenant_id):
				nonlocal started, active
				with condition:
					started += 1
					active += 1
					condition.notify_all()
					condition.wait_for(release.is_set, timeout=5)
					active -= 1

		self.listener_class.side_effect = Listener
		self.scheduler.try_pickup_event_now('tenant-1')
		self.scheduler.try_pickup_event_now('tenant-2')
		with condition:
			self.assertTrue(condition.wait_for(lambda: started == 2, timeout=5))
			self.assertEqual(2, active)
		release.set()
		self.wait_until(lambda: not self.scheduler.pickup_running)

		self.assertEqual(2, len(listeners))
		self.assertIsNot(listeners[0], listeners[1])
		self.assertIsNot(listeners[0].storage, listeners[1].storage)
		self.scheduler.event_listener.pickup_event.assert_not_called()
		for listener in listeners:
			listener.storage.close.assert_called_once_with()

	def test_pickup_threads_are_bounded(self):
		condition = threading.Condition()
		release = threading.Event()
		started = 0
		active = 0
		listeners = []

		class Listener:
			def __init__(self):
				self.storage = Mock()
				with condition:
					listeners.append(self)

			def pickup_event(self, tenant_id):
				nonlocal started, active
				with condition:
					started += 1
					active += 1
					condition.notify_all()
					condition.wait_for(release.is_set, timeout=5)
					active -= 1

		self.listener_class.side_effect = Listener
		for index in range(40):
			self.scheduler.try_pickup_event_now(f'tenant-{index}')
		with condition:
			self.assertTrue(condition.wait_for(lambda: started == 4, timeout=5))
			self.assertEqual(4, active)
		pickup_threads = [thread for thread in threading.enumerate()
		                  if thread.name.startswith('collector-event-pickup')]
		self.assertEqual(4, len(pickup_threads))
		release.set()
		self.wait_until(lambda: not self.scheduler.pickup_running)
		self.assertEqual(40, len(listeners))

	def test_api_only_node_is_noop(self):
		self.scheduler.event_listener = None
		with patch.object(self.scheduler.pickup_executor, 'submit') as submit:
			self.scheduler.try_pickup_event_now('tenant-1')
		submit.assert_not_called()
		self.listener_class.assert_not_called()
		self.assertFalse(self.scheduler.pickup_running)

	def test_background_listener_failure_does_not_escape_nudge(self):
		self.listener_class.side_effect = RuntimeError('pickup failed')
		with self.assertLogs('watchmen_collector_surface.scheduler', level='ERROR'):
			self.scheduler.try_pickup_event_now('tenant-1')
			self.wait_until(lambda: not self.scheduler.pickup_running)
		self.assertEqual(1, self.listener_class.call_count)

	def test_shutdown_waits_for_pickup_and_closes_storage(self):
		started = threading.Event()
		release = threading.Event()
		listener = Mock()
		listener.storage = Mock()
		listener.pickup_event.side_effect = lambda tenant_id: (started.set(), release.wait(5))
		self.listener_class.return_value = listener
		errors = []

		def shutdown():
			try:
				self.scheduler.shutdown()
			except Exception as e:
				errors.append(e)

		self.scheduler.try_pickup_event_now('tenant-1')
		self.assertTrue(started.wait(5))
		shutdown_thread = threading.Thread(target=shutdown)
		shutdown_thread.start()
		self.wait_until(lambda: self.scheduler.pickup_shutdown)
		self.assertTrue(shutdown_thread.is_alive())
		release.set()
		shutdown_thread.join(5)

		self.assertFalse(shutdown_thread.is_alive())
		self.assertEqual([], errors)
		listener.storage.close.assert_called_once_with()
		self.scheduler.try_pickup_event_now('tenant-2')
		self.assertEqual(1, self.listener_class.call_count)


if __name__ == '__main__':
	unittest.main()
