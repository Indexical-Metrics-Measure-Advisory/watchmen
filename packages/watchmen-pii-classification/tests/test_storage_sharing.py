"""Tests for request-scoped storage sharing.

Regression tests for the 500 caused by opening a transaction on one
``PIITermService`` instance while the action ran on another (each
``ask_meta_storage()`` call builds a new storage instance, so connections
were never shared). The lineage resolvers must reuse the request-scoped
term service's storage and must not open nested transactions on it (RDS
``begin()`` is not re-entrant on a single storage instance).
"""
from watchmen_pii.service.downstream_lineage import DownstreamLineageResolver
from watchmen_pii.service.upstream_lineage import UpstreamLineageResolver


class FakeTermService:
	"""Sentinel stand-in for PIITermService; no real storage involved."""

	def __init__(self):
		self.storage = object()
		self.snowflakeGenerator = object()
		self.principalService = None


def _assert_shares_request_storage(resolver, term_service):
	assert resolver._owns_storage is False
	assert resolver._topic_service.storage is term_service.storage
	assert resolver._pipeline_service.storage is term_service.storage
	# Reads on a shared storage run as-is; no nested begin/commit.
	assert resolver._readonly(resolver._topic_service, lambda: 42) == 42


def test_upstream_resolver_shares_request_storage():
	term_service = FakeTermService()
	resolver = UpstreamLineageResolver(None, pii_term_service=term_service)
	_assert_shares_request_storage(resolver, term_service)


def test_downstream_resolver_shares_request_storage():
	term_service = FakeTermService()
	resolver = DownstreamLineageResolver(None, pii_term_service=term_service)
	_assert_shares_request_storage(resolver, term_service)
