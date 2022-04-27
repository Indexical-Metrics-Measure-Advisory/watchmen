from typing import Callable, Optional, Tuple, Dict

from fastapi import FastAPI
from logging import getLogger
from watchmen_meta.auth import build_find_user_by_name, build_find_user_by_pat
from watchmen_model.admin import User
from watchmen_pipeline_surface import pipeline_surface
from watchmen_rest import RestApp
from watchmen_rest_doll.sso.sso import install_saml

from .settings import DollSettings

logger = getLogger(f'app.{__name__}')

class DollApp(RestApp):
	def get_settings(self) -> DollSettings:
		# noinspection PyTypeChecker
		return self.settings

	def build_find_user_by_name(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_name()

	def build_find_user_by_pat(self) -> Callable[[str], Optional[User]]:
		"""
		autonomous transaction
		"""
		return build_find_user_by_pat()

	def is_tuple_delete_enabled(self) -> bool:
		return self.get_settings().TUPLE_DELETABLE

	def ask_create_pipeline_monitor_topics_on_tenant_create(self) -> bool:
		return self.get_settings().CREATE_PIPELINE_MONITOR_TOPICS_ON_TENANT_CREATE

	def ask_create_dqc_topics_on_tenant_create(self) -> bool:
		return self.get_settings().CREATE_DQC_TOPICS_ON_TENANT_CREATE

	def post_construct(self, app: FastAPI) -> None:
		pass

	def init_sso(self, app: FastAPI) -> None:
		if self.is_sso_on():
			if self.settings.SSO_PROVIDER =="saml2":
				install_saml(app, self.settings)
			else:
				logger.error(f'SSO provider {self.settings.SSO_PROVIDER} is not supported.')

	# noinspection PyMethodMayBeStatic
	def init_pipeline_surface(self) -> None:
		pipeline_surface.init_connectors()

	def on_startup(self, app: FastAPI) -> None:
		self.init_pipeline_surface()


doll = DollApp(DollSettings())


def ask_jwt_params() -> Tuple[str, str]:
	return doll.get_jwt_params()


def ask_access_token_expires_in() -> int:
	return doll.get_access_token_expires_in()


def ask_tuple_delete_enabled() -> bool:
	return doll.is_tuple_delete_enabled()


def ask_create_pipeline_monitor_topics_on_tenant_create() -> bool:
	return doll.ask_create_pipeline_monitor_topics_on_tenant_create()


def ask_create_dqc_topics_on_tenant_create() -> bool:
	return doll.ask_create_dqc_topics_on_tenant_create()


def ask_saml_settings() -> Dict:
    saml_settings = {
        'strict': settings.SAML_STRICT,
        'debug': settings.SAML_DEBUG,
        'sp': {
            'entityId': settings.SAML_SP_ENTITY_ID,
            'assertionConsumerService': {
                "url": settings.SAML_SP_ASSERT_URL,
                "binding": settings.SAML_SP_ASSERT_BINDING
            },
            "x509cert": settings.SAML_SP_X509CERT,

        },
        "idp": {
            "entityId": settings.SAML_IDP_ENTITY_ID,
            "singleSignOnService": {
                "url": settings.SAML_IDP_SSO_URL,
                "binding": settings.SAML_IDP_SSO_BINDING
            },
            "x509cert": settings.SAML_IDP_X509CERT
        },
    }

    return saml_settings