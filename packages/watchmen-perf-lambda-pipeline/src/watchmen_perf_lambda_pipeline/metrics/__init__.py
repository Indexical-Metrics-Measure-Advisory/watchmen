"""Three-layer metric collectors for the perf runner.

- driver: Locust native stats (read from locust's stats registry or CSV)
- business: doll /pipeline/log/stats + /pipeline/log (per-pipeline monitor log)
- resource: Prometheus /metrics + LocalStack CloudWatch (Lambda/SQS)
"""
