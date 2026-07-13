"""Transaction wrappers for the PII classification package.

These mirror the per-package ``util/trans.py`` copies found in
``watchmen-rest-dqc`` and ``watchmen-metricflow`` — the established project
convention is for every rest-style package to ship its own copy.
"""
from .trans import trans, trans_readonly, trans_with_fail_over, trans_with_tail

__all__ = ["trans", "trans_readonly", "trans_with_tail", "trans_with_fail_over"]
