from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from watchmen_rest.system import health_router
from watchmen_storage import InsertConflictException
from watchmen_task_hub.service import TaskAccessDeniedException, TaskCapabilityException, TaskConflictException, \
	TaskHubException, TaskNotFoundException, TaskValidationException
from watchmen_utilities import ArrayHelper

from .app import taskhub_app
from .router.alert_router import router as alert_router
from .router.dependency_router import router as dependency_router
from .router.monitor_router import router as monitor_router
from .router.run_router import router as run_router
from .router.task_router import router as task_router
from .router.view_router import router as view_router

app: FastAPI = taskhub_app.construct()


@app.on_event('startup')
def startup():
	taskhub_app.on_startup(app)


app.include_router(health_router.router)
if taskhub_app.get_settings().TASKHUB_ON:
	ArrayHelper([
		task_router, run_router, dependency_router, monitor_router, view_router, alert_router
	]).each(lambda router: app.include_router(router))


def status_for(exception: Exception) -> int:
	if isinstance(exception, TaskNotFoundException):
		return 404
	if isinstance(exception, TaskAccessDeniedException):
		return 403
	if isinstance(exception, (TaskConflictException, TaskCapabilityException, InsertConflictException)):
		return 409
	if isinstance(exception, TaskValidationException):
		return 400
	return 500


@app.exception_handler(TaskHubException)
@app.exception_handler(InsertConflictException)
async def handle_taskhub_exception(_request: Request, exception: Exception):
	status = status_for(exception)
	return JSONResponse(status_code=status, content={'detail': str(exception)})
