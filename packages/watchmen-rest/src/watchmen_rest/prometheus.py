from fastapi import FastAPI
from starlette_prometheus import metrics, PrometheusMiddleware


def install_prometheus(app: FastAPI) -> None:
	app.add_middleware(PrometheusMiddleware)
	app.add_route("/metrics", metrics)
