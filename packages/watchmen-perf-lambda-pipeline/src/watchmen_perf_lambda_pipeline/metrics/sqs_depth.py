"""Resource-layer: SQS queue depth via LocalStack CloudWatch.

The collector's coordinator/worker fan-out happens over SQS
(see watchmen-serverless-lambda/queue/sqs_standard_sender.py). Queue backlog
(ApproxNumberOfMessagesVisible) is the key indicator that the SQS-driven stages
cannot keep up with ingestion rate.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import boto3


@dataclass
class SqsDepthSnapshot:
	queue_url: str
	visible: int = 0
	not_visible: int = 0  # in-flight
	total: int = 0

	def to_dict(self) -> dict[str, Any]:
		return {
			'queueUrl': self.queue_url,
			'visible': self.visible,
			'notVisible': self.not_visible,
			'total': self.total,
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


def _sqs_client():
	endpoint = os.environ.get('AWS_ENDPOINT_URL', 'http://localstack:4566')
	region = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
	return boto3.client(
		'sqs',
		endpoint_url=endpoint,
		region_name=region,
		aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID', 'test'),
		aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY', 'test'),
	)


def collect_sqs_depth(queue_urls: list[str] | None = None) -> list[SqsDepthSnapshot]:
	"""Read ApproxNumberOfMessagesVisible / NotVisible for each queue."""
	if queue_urls is None:
		collector_url = os.environ.get('SERVERLESS_QUEUE_URL', '')
		extract_url = os.environ.get('SERVERLESS_EXTRACT_TABLE_QUEUE_URL', '')
		queue_urls = [u for u in (collector_url, extract_url) if u]
	if not queue_urls:
		return []

	sqs = _sqs_client()
	snapshots: list[SqsDepthSnapshot] = []
	for url in queue_urls:
		try:
			attrs = sqs.get_queue_attributes(
				QueueUrl=url,
				AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
			).get('Attributes', {})
			visible = int(attrs.get('ApproximateNumberOfMessages', '0'))
			not_visible = int(attrs.get('ApproximateNumberOfMessagesNotVisible', '0'))
			snapshots.append(SqsDepthSnapshot(
				queue_url=url, visible=visible, not_visible=not_visible, total=visible + not_visible,
			))
		except Exception:  # noqa: BLE001
			snapshots.append(SqsDepthSnapshot(queue_url=url))
	return snapshots


def collect_sqs_depth_as_dict(queue_urls: list[str] | None = None) -> list[dict[str, Any]]:
	return [s.to_dict() for s in collect_sqs_depth(queue_urls)]
