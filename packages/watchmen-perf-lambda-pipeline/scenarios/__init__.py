"""Locust scenarios for the Lambda -> pipeline performance tests.

Run a scenario with:
    locust -f scenarios/scenario_a_pipeline_direct.py --headless -u 50 -r 5 -t 5m

The directory is named `scenarios/` (not `locust/`) to avoid shadowing the
third-party `locust` package that the scenarios import.
"""
