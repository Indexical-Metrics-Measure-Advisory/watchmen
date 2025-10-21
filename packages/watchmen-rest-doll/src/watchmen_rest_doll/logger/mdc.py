from fastapi import FastAPI

from watchmen_rest import RestSettings


def install_mdc(app: FastAPI, settings: RestSettings) -> None:
    from .mdc_middleware import MDCMiddleware
    
    app.add_middleware(
        MDCMiddleware
    )