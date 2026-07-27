"""Verify metric model parsing (PipelineLogStats.from_dict)."""
from __future__ import annotations

from watchmen_perf_lambda_pipeline.metrics.collector import PipelineLogStats


def test_pipeline_log_stats_from_dict_full() -> None:
	data = {
		'total': 1000,
		'byStatus': {'DONE': 990, 'ERROR': 8, 'IGNORED': 2},
		'avgDurationMs': 1840,
		'p95DurationMs': 3210,
		'insertCount': 990,
		'updateCount': 0,
		'deleteCount': 0,
		'sampleSize': 200,
	}
	stats = PipelineLogStats.from_dict(data)
	assert stats.total == 1000
	assert stats.done == 990
	assert stats.error == 8
	assert stats.ignored == 2
	assert stats.avg_duration_ms == 1840
	assert stats.p95_duration_ms == 3210
	assert stats.insert_count == 990
	assert stats.sample_size == 200


def test_pipeline_log_stats_from_dict_empty() -> None:
	stats = PipelineLogStats.from_dict({})
	assert stats.total == 0
	assert stats.done == 0
	assert stats.p95_duration_ms == 0


def test_pipeline_log_stats_round_trip() -> None:
	original = {
		'total': 5,
		'byStatus': {'DONE': 5, 'ERROR': 0, 'IGNORED': 0},
		'avgDurationMs': 100,
		'p95DurationMs': 200,
		'insertCount': 5,
		'updateCount': 0,
		'deleteCount': 0,
		'sampleSize': 5,
	}
	stats = PipelineLogStats.from_dict(original)
	round_tripped = stats.to_dict()
	assert round_tripped['total'] == 5
	assert round_tripped['byStatus']['DONE'] == 5
	assert round_tripped['p95DurationMs'] == 200
