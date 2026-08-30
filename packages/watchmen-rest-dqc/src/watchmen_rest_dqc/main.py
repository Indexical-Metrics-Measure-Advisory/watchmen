from watchmen_pii.router import pii_router
from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
from watchmen_data_dictionary import (
	init_dictionary_jobs,
	shutdown_dictionary_jobs,
)
from watchmen_data_dictionary.api import (
	configs as dictionary_configs,
	jobs as dictionary_jobs,
	storage as dictionary_storage,
)
from .admin import catalog_router, monitor_rules_router
from .data_health import data_health_router
from .dqc import dqc
from .monitor import topic_monitor_router
from .topic_profile import topic_profile_router

app = dqc.construct()


def pii_classification_enabled() -> bool:
	# the watchmen-pii-classification package is imported (and its router
	# mounted) only when the host explicitly turns the feature on
	return bool(dqc.get_settings().PII_CLASSIFICATION_ENABLED)


def dictionary_enabled() -> bool:
	# the data dictionary generator (jobs/configs/storage routers plus its
	# APScheduler) is mounted unless the host explicitly turns it off
	return bool(dqc.get_settings().DICTIONARY_ENABLED)


@app.on_event("startup")
def startup():
	dqc.on_startup(app)

	if dictionary_enabled():
		try:
			init_dictionary_jobs()
		except Exception as e:
			import logging
			logging.getLogger(__name__).warning(f"Data dictionary scheduler failed to start: {e}")

	if not pii_classification_enabled():
		return

	# Import PII classification seed terms if table is empty,
	# mirroring the glossary seed pattern in watchmen-metricflow
	try:
		from watchmen_auth import PrincipalService
		from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
		from watchmen_model.admin.user import User, UserRole
		from watchmen_pii.meta import PIITermService
		from watchmen_pii.seed import import_seed_if_empty

		system_user = User(
			userId='system',
			name='system',
			tenantId='1',
			role=UserRole.SUPER_ADMIN,
		)
		principal_service = PrincipalService(system_user)
		service = PIITermService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
		import_seed_if_empty(service, principal_service)
	except Exception as e:
		import logging
		logging.getLogger(__name__).warning(f"PII seed import failed during startup: {e}")


routers = [
	# system
	health_router.router,
	catalog_router.router, monitor_rules_router.router,
	topic_monitor_router.router, topic_profile_router.router,
	data_health_router.router,
	pii_router.router,
		
]

# data dictionary generator keeps the v3/v4 client contract under /api
if dictionary_enabled():
	app.include_router(dictionary_jobs.router, prefix='/api')
	app.include_router(dictionary_configs.router, prefix='/api')
	app.include_router(dictionary_storage.router, prefix='/api')

ArrayHelper(routers).each(lambda x: app.include_router(x))


@app.on_event("shutdown")
def shutdown():
	if dictionary_enabled():
		try:
			shutdown_dictionary_jobs()
		except Exception as e:
			import logging
			logging.getLogger(__name__).warning(f"Data dictionary scheduler failed to stop: {e}")
