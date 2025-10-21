import logging
from .mdc import _mdc_context


class MDCFilter(logging.Filter):

    def __init__(self, default_tenant: str):
        super().__init__()
        self.default_tenant = default_tenant
    
    def filter(self, record: logging.LogRecord) -> bool:
        # get current MDC context from contextvar
        mdc_data = _mdc_context.get()
        value = mdc_data.get("tenant", self.default_tenant)
        setattr(record, "tenant", value)
        return True