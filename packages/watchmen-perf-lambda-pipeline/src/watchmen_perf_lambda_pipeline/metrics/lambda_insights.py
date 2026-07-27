"""Resource-layer: Lambda insights via LocalStack CloudWatch.

Reads Lambda Duration / Invocations / Errors / Throttles metric statistics from
CloudWatch (which LocalStack publishes for functions invoked through it).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3


@dataclass
class LambdaInsights:
	function_name: str
	invocations: float = 0.0
	errors: float = 0.0
	throttles: float = 0.0
	duration_avg_ms: float = 0.0
	duration_max_ms: float = 0.0

	def to_dict(self) -> dict[str, Any]:
		return {
			'functionName': self.function_name,
			'invocations': self.invocations,
			'errors': self.errors,
			'throttles': self.throttles,
			'durationAvgMs': self.duration_avg_ms,
			'durationMaxMs': self.duration_max_ms,
		}


def _cloudwatch_client():
	endpoint = os.environ.get('AWS_ENDPOINT_URL', 'http://localstack:4566')
	region = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
	return boto3.client(
		'cloudwatch',
		endpoint_url=endpoint,
		region_name=region,
		aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID', 'test'),
		aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY', 'test'),
	)


def _query_metric(cw, metric_name: str, namespace: str, fn_name: str,
                  start: datetime, end: datetime) -> float:
	try:
		resp = cw.get_metric_statistics(
			Namespace=namespace,
			MetricName=metric_name,
			Dimensions=[{'Name': 'FunctionName', 'Value': fn_name}],
			StartTime=start,
			EndTime=end,
			Period=60,
			Statistics=['Sum', 'Average', 'Maximum'],
		)
		datapoints = resp.get('Datapoints', [])
		if not datapoints:
			return 0.0
		# Sum for count metrics, Average for duration
		if metric_name == 'Duration':
			return sum(d.get('Average', 0.0) for d in datapoints) / len(datapoints) * 1000.0
		return sum(d.get('Sum', 0.0) for d in datapoints)
	except Exception:  # noqa: BLE001
		return 0.0


def _query_duration_max(cw, fn_name: str, start: datetime, end: datetime) -> float:
	try:
		resp = cw.get_metric_statistics(
			Namespace='AWS/Lambda',
			MetricName='Duration',
			Dimensions=[{'Name': 'FunctionName', 'Value': fn_name}],
			StartTime=start,
			EndTime=end,
			Period=60,
			Statistics=['Maximum'],
		)
		datapoints = resp.get('Datapoints', [])
		if not datapoints:
			return 0.0
		return max(d.get('Maximum', 0.0) for d in datapoints) * 1000.0
	except Exception:  # noqa: BLE001
		return 0.0


def collect_lambda_insights(
	function_name: str | None = None,
	window_minutes: int = 15,
) -> LambdaInsights:
	fn_name = function_name or os.environ.get('LAMBDA_FUNCTION_NAME', 'watchmen-collector')
	cw = _cloudwatch_client()
	end = datetime.now(timezone.utc)
	start = end - timedelta(minutes=window_minutes)

	return LambdaInsights(
		function_name=fn_name,
		invocations=_query_metric(cw, 'Invocations', 'AWS/Lambda', fn_name, start, end),
		errors=_query_metric(cw, 'Errors', 'AWS/Lambda', fn_name, start, end),
		throttles=_query_metric(cw, 'Throttles', 'AWS/Lambda', fn_name, start, end),
		duration_avg_ms=_query_metric(cw, 'Duration', 'AWS/Lambda', fn_name, start, end),
		duration_max_ms=_query_duration_max(cw, fn_name, start, end),
	)
