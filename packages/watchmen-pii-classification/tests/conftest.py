"""Shared pytest setup for watchmen-pii-classification tests.

Importing ``watchmen_meta.common`` initializes its settings module, which by
default tries to claim a competitive snowflake worker id against the meta
storage (i.e. it opens a real database connection at import time). These
tests are storage-free, so disable competitive workers before any watchmen
module gets imported — the generator then falls back to a fixed worker id.
"""
import os

os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')
