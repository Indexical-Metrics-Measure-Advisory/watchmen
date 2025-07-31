import traceback
from datetime import datetime

from watchmen_serverless_lambda.storage.log_service import FileLogService


def log_error(tenant_id: str, log_service: FileLogService, key:str,  exception: Exception):
    stack_trace = traceback.format_exc()
    error_log = {
        "tenant_id": tenant_id,
        "timestamp": datetime.now().isoformat(),
        "error_type": type(exception).__name__,
        "error_message": str(exception),
        "stack_trace": stack_trace
    }
    log_service.log_result(tenant_id, key, error_log)