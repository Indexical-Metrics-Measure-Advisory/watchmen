import logging

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin.user import User, UserRole

from watchmen_metricflow.meta.business_glossary_meta_service import GlossaryService
from watchmen_metricflow.data.glossary_seed_data import ALL_SEED_BUNDLES

logger = logging.getLogger(__name__)


def import_glossary_seed_data(tenant_id: str = '1') -> None:
	"""
	Import glossary seed data into the database if the table is empty.
	Called during application startup or by a CLI script.
	"""
	storage = ask_meta_storage()
	snowflake_generator = ask_snowflake_generator()

	# Create a system principal for seed import
	system_user = User(
		userId='system',
		name='system',
		tenantId=tenant_id,
		role=UserRole.SUPER_ADMIN,
	)
	principal_service = PrincipalService(system_user)

	service = GlossaryService(storage, snowflake_generator, principal_service)

	try:
		existing = service.list_bundles()
		if existing and len(existing) > 0:
			logger.info(f"Glossary table already has {len(existing)} bundles, skipping seed import.")
			return
	except Exception as e:
		logger.warning(f"Could not check existing glossary data: {e}, proceeding with seed import.")

	logger.info("Importing glossary seed data...")
	for bundle in ALL_SEED_BUNDLES:
		try:
			# Set tenant id on glossary
			bundle.glossary.tenantId = tenant_id
			# Set tenant id on categories and terms
			for cat in bundle.categories:
				cat.glossary_id = bundle.glossary.id
			for term in bundle.terms:
				term.glossary_id = bundle.glossary.id
			service.create_bundle(bundle)
			logger.info(f"  Created glossary: {bundle.glossary.name} ({len(bundle.categories)} categories, {len(bundle.terms)} terms)")
		except Exception as e:
			logger.error(f"  Failed to create glossary {bundle.glossary.name}: {e}")

	logger.info("Glossary seed data import completed.")
