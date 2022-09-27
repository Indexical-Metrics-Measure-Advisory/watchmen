from enum import Enum

from watchmen_rest import RestSettings


class SSOTypes(str, Enum):
	SAML2 = 'saml2'
	DOLL = "doll"


class DollSettings(RestSettings):
	APP_NAME: str = 'Watchmen Doll'

	TUPLE_DELETABLE: bool = False
	CREATE_PIPELINE_MONITOR_TOPICS_ON_TENANT_CREATE: bool = True
	CREATE_DQC_TOPICS_ON_TENANT_CREATE: bool = False  # enable it when dqc is on

	HIDE_DATASOURCE_PWD = True # hide datasource pwd on api

	SSO_ON: bool = False
	SSO_PROVIDER: SSOTypes = SSOTypes.SAML2
	SAML_STRICT: bool = False
	SAML_DEBUG: bool = False
	SAML_IDP_ENTITY_ID: str = ""
	SAML_IDP_SSO_URL: str = ""
	SAML_IDP_SSO_BINDING: str = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
	SAML_IDP_X509CERT: str = ''
	SAML_SP_ENTITY_ID: str = ''
	SAML_SP_ASSERT_URL: str = ''
	SAML_SP_ASSERT_BINDING: str = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
	SAML_SP_X509CERT: str = ''
