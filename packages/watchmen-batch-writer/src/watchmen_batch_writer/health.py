import asyncio
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from json import dumps
from logging import getLogger
from typing import Any, Dict, Optional

from .accumulator import Accumulator

logger = getLogger(__name__)


class HealthState:
	def __init__(self, accumulator: Optional[Accumulator] = None, consumer=None):
		self.accumulator = accumulator
		self.consumer = consumer

	def snapshot(self) -> Dict[str, Any]:
		buf = {}
		if self.accumulator is not None:
			for key, group in self.accumulator._groups.items():
				buf[group.table_name] = buf.get(group.table_name, 0) + group.size()
		connected = False
		if self.consumer is not None and getattr(self.consumer, '_consumer', None) is not None:
			connected = True
		return {
			'status': 'ok' if connected else 'degraded',
			'consumer_connected': connected,
			'buffers': buf,
		}


class _Handler(BaseHTTPRequestHandler):
	state: HealthState = None  # type: ignore[assignment]

	def log_message(self, format, *args):  # silence default stderr noise
		logger.debug(format, *args)

	def do_GET(self):  # noqa: N802
		if self.path == '/health':
			payload = self.state.snapshot() if self.state else {'status': 'unknown'}
			body = dumps(payload).encode('utf-8')
			status = 200 if payload.get('status') == 'ok' else 503
			self.send_response(status)
			self.send_header('Content-Type', 'application/json')
			self.send_header('Content-Length', str(len(body)))
			self.end_headers()
			self.wfile.write(body)
		elif self.path == '/':
			body = b'{"name":"watchmen-batch-writer"}'
			self.send_response(200)
			self.send_header('Content-Type', 'application/json')
			self.send_header('Content-Length', str(len(body)))
			self.end_headers()
			self.wfile.write(body)
		else:
			self.send_response(404)
			self.end_headers()


def start_health_server(state: HealthState, port: int) -> ThreadingHTTPServer:
	_Handler.state = state
	server = ThreadingHTTPServer(('0.0.0.0', port), _Handler)
	loop = asyncio.get_event_loop()
	loop.run_in_executor(None, server.serve_forever)
	logger.info(f'Health HTTP server started on port {port}')
	return server
