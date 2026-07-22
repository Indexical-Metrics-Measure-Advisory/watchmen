from watchmen_rest.system import health_router
from watchmen_utilities import ArrayHelper
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


@app.on_event("startup")
def startup():
	dqc.on_startup(app)

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
]

if pii_classification_enabled():
	from watchmen_pii.app import get_pii_router

	routers.append(get_pii_router())

ArrayHelper(routers).each(lambda x: app.include_router(x))
