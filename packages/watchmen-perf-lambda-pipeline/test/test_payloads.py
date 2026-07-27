"""Verify payload templates render to valid JSON with all placeholders substituted."""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Make src/ importable without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from watchmen_perf_lambda_pipeline.payload_renderer import render_template  # noqa: E402

TEMPLATES = [
	'pipeline_data.json',
	'trigger_event_default.json',
	'trigger_event_table.json',
	'trigger_event_record.json',
	'trigger_online.json',
	'eventbridge_listener.json',
]


def test_all_templates_render_without_placeholders() -> None:
	for name in TEMPLATES:
		rendered = render_template(name)
		# Re-serialise to confirm it's valid JSON
		assert json.loads(json.dumps(rendered)) == rendered
		# No leftover {{KEY}} placeholders (only {{ marks an unresolved one;
		# bare }} is a legitimate nested-object close like `...{"k":"v"}}`).
		serialised = json.dumps(rendered)
		assert '{{' not in serialised, f'{name} has unresolved placeholders: {serialised}'


def test_pipeline_data_has_required_fields() -> None:
	rendered = render_template('pipeline_data.json')
	assert rendered['code']
	assert 'data' in rendered
	assert rendered['data']['id']
	assert rendered['data']['payload']


def test_trigger_event_record_has_records() -> None:
	rendered = render_template('trigger_event_record.json')
	assert rendered['records']
	assert rendered['records'][0]['id']


def test_eventbridge_listener_has_tenant() -> None:
	rendered = render_template('eventbridge_listener.json', PERF_TENANT_ID='t-123')
	assert rendered['tenant_id'] == 't-123'
	assert rendered['listener'] == 'event'
