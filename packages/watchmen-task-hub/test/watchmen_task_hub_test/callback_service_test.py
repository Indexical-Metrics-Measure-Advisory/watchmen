import json
import unittest
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from watchmen_task_hub.model import EngineRef, ExecutionMode, TaskDefinition, TaskRun, TaskType, TriggerType
from watchmen_task_hub.service import HttpTaskCallbackNotifier


class CallbackHandler(BaseHTTPRequestHandler):
	payloads = []
	headers_received = []

	def do_POST(self):
		body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
		self.payloads.append(json.loads(body))
		self.headers_received.append(self.headers)
		self.send_response(204)
		self.end_headers()

	def log_message(self, format, *args):
		pass


class CallbackServiceTest(unittest.TestCase):
	def setUp(self):
		CallbackHandler.payloads = []
		CallbackHandler.headers_received = []
		self.server = ThreadingHTTPServer(('127.0.0.1', 0), CallbackHandler)
		self.thread = Thread(target=self.server.serve_forever, daemon=True)
		self.thread.start()

	def tearDown(self):
		self.server.shutdown()
		self.server.server_close()
		self.thread.join()

	def test_posts_external_run_lifecycle_payload(self):
		task = TaskDefinition(
			taskId='task-1', name='Metric', taskType=TaskType.MATERIALIZATION,
			executionMode=ExecutionMode.SCHEDULED, engineRef=EngineRef(kind='metricflow', id='metric-1'),
			callback={'enabled': True, 'events': ['RUNNING'], 'timeoutSeconds': 2}, tenantId='tenant-1')
		task.callback.url = f'http://127.0.0.1:{self.server.server_port}/callback'
		run = TaskRun(
			runId='run-1', taskId='task-1', taskType=TaskType.MATERIALIZATION, instanceKey='day:2026-11-04',
			processDate=date(2026, 11, 4), status='RUNNING', triggerType=TriggerType.API,
			idempotencyKey='request-1', engineRunKey='taskhub:run-1', tenantId='tenant-1')
		HttpTaskCallbackNotifier().notify(task, run)
		self.assertEqual(1, len(CallbackHandler.payloads))
		self.assertEqual('run-1', CallbackHandler.payloads[0]['runId'])
		self.assertEqual('RUNNING', CallbackHandler.payloads[0]['status'])
		self.assertEqual('2026-11-04', CallbackHandler.payloads[0]['processDate'])
		self.assertEqual('RUNNING', CallbackHandler.headers_received[0]['X-TaskHub-Event'])


if __name__ == '__main__':
	unittest.main()
