from typing import Dict

from fastapi import Request, APIRouter
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from pydantic import BaseModel

from watchmen_model.system import Token
from watchmen_rest.util import raise_401
from watchmen_rest_doll.settings import DollSettings
from watchmen_rest_doll.sso.saml_helper import prepare_from_fastapi_request, \
    verify_signature, get_user_name_in_saml_body, find_user, build_token

router = APIRouter()

settings = DollSettings()


class LoginConfiguration(BaseModel):
    loginMethod: str = "doll",
    loginUrl: str = None


class TokenExchange(BaseModel):
    data: str = None
    algorithm: str = None
    signature: str = None
    relayState: str = None


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


@router.get('/login/config', tags=['authenticate'], response_model=LoginConfiguration)
async def load_login_config(request: Request) -> LoginConfiguration:
    if settings.SSO_ON and settings.SSO_PROVIDER == "saml2":
        req = await prepare_from_fastapi_request(request)
        auth = OneLogin_Saml2_Auth(req, ask_saml_settings())
        callback_url = auth.login()
        return LoginConfiguration(loginMethod=settings.SSO_PROVIDER, loginUrl=callback_url)
    else:
        return LoginConfiguration()


@router.post('/exchange/token', tags=['authenticate'])
async def token_exchange(token_exchange: TokenExchange) -> Token:
    if settings.SSO_ON and settings.SSO_PROVIDER == "saml2":
        if verify_signature(token_exchange.data, token_exchange.algorithm, token_exchange.signature,
                            token_exchange.relayState, ask_saml_settings()):
            user_name = get_user_name_in_saml_body(token_exchange.data)
            user = find_user(user_name)
            return build_token(user, settings)
        else:
            raise_401("Invalid signature")
