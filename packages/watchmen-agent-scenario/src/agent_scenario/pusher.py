import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

AGENT_CLI = 'agent_cli'
AGENT_RUNTIME_CLI = 'agent_runtime_cli'


class CliError(Exception):
	"""Raised when an agent CLI subprocess fails or prints unexpected output."""


def run_module(module: str, args: List[str], expect_json: bool = True) -> Dict[str, Any]:
	"""Run `python -m <module> ...` and return its parsed JSON stdout.

	Both CLIs print a single JSON document on stdout and plain-text errors on
	stderr with a non-zero exit code, which makes them subprocess friendly.
	"""
	command = [sys.executable, '-m', module] + args
	completed = subprocess.run(command, capture_output=True, text=True)
	if completed.returncode != 0:
		raise CliError(f'{" ".join(command)}\nexit={completed.returncode}\n{completed.stderr.strip()}')
	stdout = completed.stdout.strip()
	if not expect_json:
		return {'stdout': stdout}
	try:
		return json.loads(stdout)
	except json.JSONDecodeError as e:
		raise CliError(f'{" ".join(command)} printed non-JSON output: {truncate(stdout)} ({e})') from e


class Pusher:
	"""Drives agent-cli to sync the scenario YAML into an (empty) environment."""

	def __init__(self, settings: Settings, report: Report, pat: str, admin_client=None) -> None:
		self.settings = settings
		self.report = report
		self.pat = pat
		self.admin_client = admin_client

	# ------------------------------------------------------------------ helpers

	def agent_cli(self, args: List[str], expect_json: bool = True) -> Dict[str, Any]:
		return run_module(AGENT_CLI, args, expect_json)

	def agent_cli_main(self, args: List[str], expect_json: bool = True) -> Dict[str, Any]:
		return run_module(f'{AGENT_CLI}.main', args, expect_json)

	def runtime_cli(self, args: List[str], expect_json: bool = True) -> Dict[str, Any]:
		return run_module(AGENT_RUNTIME_CLI, args, expect_json)

	def vault_arg(self) -> str:
		return str(self.settings.vault_dir.resolve())

	def metric_vault_arg(self) -> str:
		return str(self.settings.metric_vault_dir.resolve())

	def runtime_vault_arg(self) -> str:
		return str(self.settings.runtime_vault_dir.resolve())

	def render(self, source: Path, target: Path, replacements: Dict[str, str]) -> Path:
		text = source.read_text(encoding='utf-8')
		for placeholder, value in replacements.items():
			text = text.replace(placeholder, value)
		target.parent.mkdir(parents=True, exist_ok=True)
		target.write_text(text, encoding='utf-8')
		return target

	# ------------------------------------------------------------------- steps

	def init_vaults(self) -> None:
		self.settings.vault_dir.mkdir(parents=True, exist_ok=True)
		self.settings.metric_vault_dir.mkdir(parents=True, exist_ok=True)
		self.settings.runtime_vault_dir.mkdir(parents=True, exist_ok=True)
		# `--pat=<value>` form: a PAT may legally start with '-' which argparse
		# would otherwise parse as an option flag
		self.agent_cli([
			'init', f'--vault={self.vault_arg()}',
			f'--host={self.settings.doll_host}', f'--pat={self.pat}'], expect_json=False)
		self.agent_cli([
			'init', f'--vault={self.metric_vault_arg()}',
			f'--host={self.settings.metricflow_host}', f'--pat={self.pat}'], expect_json=False)
		self.runtime_cli([
			'init', f'--vault={self.runtime_vault_arg()}',
			f'--host={self.settings.metricflow_host}', f'--pat={self.pat}'], expect_json=False)
		self.report.record('push.init_vaults', True,
			f'{self.vault_arg()} + {self.metric_vault_arg()} + {self.runtime_vault_arg()}')

	def _timed(self, name: str, action) -> Dict[str, Any]:
		started = time.monotonic()
		try:
			result = action()
		except CliError as e:
			self.report.record(name, False, truncate(e), int((time.monotonic() - started) * 1000))
			raise
		self.report.record(name, True, truncate(result), int((time.monotonic() - started) * 1000))
		return result

	@staticmethod
	def _expect_action(result: Dict[str, Any], expected: tuple) -> Dict[str, Any]:
		"""Fail loudly when the server reports an unexpected upsert action."""
		action = str(result.get('action') or '').strip()
		if action not in expected:
			raise CliError(f'unexpected action [{action}], expected {expected}: {truncate(result)}')
		return result

	def resolve_topic_id(self, topic_name: str) -> str:
		"""Fetch the server-side topicId by name.

		The agent-upsert response carries the no-id agent view on purpose, so the
		topicId must be read back from the regular doll REST API.
		"""
		found = self.admin_client.get(
			'/topic/list/name', params={'query_name': topic_name, 'exclude_types': ''})
		for topic in found or []:
			if topic.get('name') == topic_name:
				topic_id = str(topic.get('topicId') or '').strip()
				if topic_id:
					return topic_id
		raise CliError(f'topic [{topic_name}] not found on server after push')

	def push_topics(self) -> Dict[str, str]:
		"""Render + dry-run + push every topic; returns {topicName: topicId}."""
		source_dir = self.settings.scenario_dir / 'topics'
		target_dir = self.settings.vault_dir / 'transformation' / 'topics'
		replacements = {'__DATASOURCE_CODE__': self.settings.datasource_code}
		topic_ids: Dict[str, str] = {}
		for source in sorted(source_dir.glob('*.yml')):
			target = self.render(source, target_dir / source.name, replacements)
			self._timed(f'push.topic.dry_run.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli([
					'topic', 'push-file', str(t), '--vault', self.vault_arg(), '--dry-run']),
					('would_create', 'would_update')))
			self._timed(f'push.topic.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli([
					'topic', 'push-file', str(t), '--vault', self.vault_arg()]),
					('create', 'update')))
			topic_ids[source.stem] = self.resolve_topic_id(source.stem)
		return topic_ids

	def push_pipelines(self) -> None:
		source_dir = self.settings.scenario_dir / 'pipelines'
		target_dir = self.settings.vault_dir / 'transformation' / 'pipelines'
		for source in sorted(source_dir.glob('*.yml')):
			target = self.render(source, target_dir / source.name, {})
			self._timed(f'push.pipeline.dry_run.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli([
					'pipeline', 'push-file', str(t), '--vault', self.vault_arg(), '--dry-run']),
					('would_create', 'would_update')))
			self._timed(f'push.pipeline.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli([
					'pipeline', 'push-file', str(t), '--vault', self.vault_arg()]),
					('create', 'update')))

	def push_semantic(self, topic_ids: Dict[str, str]) -> None:
		source_dir = self.settings.scenario_dir / 'semantics'
		target_dir = self.settings.vault_dir / 'metrics' / 'semantics'
		replacements = {
			f'__TOPIC_ID_{name}__': topic_id for name, topic_id in topic_ids.items()
		}
		# the Typer `semantic push-file` command misses the dry_run flag (its
		# handler crashes on args.dry_run), so use the argparse entrypoint instead
		for source in sorted(source_dir.glob('*.yml')):
			target = self.render(source, target_dir / source.name, replacements)
			self._timed(f'push.semantic.dry_run.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli_main([
					'semantic', 'push-file', str(t), '--vault', self.metric_vault_arg(), '--dry-run']),
					('would_create', 'would_update')))
			self._timed(f'push.semantic.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli_main([
					'semantic', 'push-file', str(t), '--vault', self.metric_vault_arg()]),
					('create', 'update')))

	def push_metrics(self) -> None:
		source_dir = self.settings.scenario_dir / 'metrics'
		target_dir = self.settings.vault_dir / 'metrics' / 'metric'
		# same as semantic: argparse entrypoint carries the working --dry-run flag
		for source in sorted(source_dir.glob('*.yml')):
			target = self.render(source, target_dir / source.name, {})
			self._timed(f'push.metric.dry_run.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli_main([
					'metric', 'push-file', str(t), '--vault', self.metric_vault_arg(), '--dry-run']),
					('would_create', 'would_update')))
			self._timed(f'push.metric.{source.stem}',
				lambda t=target: self._expect_action(self.agent_cli_main([
					'metric', 'push-file', str(t), '--vault', self.metric_vault_arg()]),
					('create', 'update')))

	def push_ontology(self) -> None:
		source_dir = self.settings.scenario_dir / 'ontology'
		target_dir = self.settings.vault_dir / 'ontology'
		for source in sorted(source_dir.glob('*.yml')):
			target = self.render(source, target_dir / source.name, {})
			# the ontology upsert result carries no action field; name is its key
			def push_and_expect(t=target, stem=source.stem) -> Dict[str, Any]:
				result = self.agent_cli(['ontology', 'push-file', str(t), '--vault', self.metric_vault_arg()])
				if str(result.get('name') or '').strip() != stem:
					raise CliError(f'ontology push returned name [{result.get("name")}], expected [{stem}]')
				return result
			self._timed(f'push.ontology.{source.stem}', push_and_expect)

	def push_all(self) -> Dict[str, str]:
		"""Full config-plane sync; returns the topicId map for later steps."""
		self.init_vaults()
		topic_ids = self.push_topics()
		self.push_pipelines()
		self.push_semantic(topic_ids)
		self.push_metrics()
		self.push_ontology()
		return topic_ids
