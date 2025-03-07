from fastapi import APIRouter
from typing import Optional

from watchmen_model.system import Token
from watchmen_rest.util import raise_401, raise_404
from watchmen_rest_doll.doll import ask_saml2_enabled, ask_saml2_settings
from watchmen_utilities import ExtendedBaseModel
from .saml_helper import build_token, find_user, get_user_name_in_saml_body, verify_signature

router = APIRouter()


class TokenExchange(ExtendedBaseModel):
	data: Optional[str] = None
	algorithm: Optional[str] = None
	signature: Optional[str] = None
	relayState: Optional[str] = None


class SamlToken(Token):
	accountName: Optional[str] = None


@router.post('/token/exchange-saml', tags=['authenticate'])
async def token_exchange(token: TokenExchange) -> SamlToken:
	if ask_saml2_enabled():
		if verify_signature(
				token.data, token.algorithm, token.signature, token.relayState, ask_saml2_settings()):
			user_name = get_user_name_in_saml_body(token.data)
			user = find_user(user_name)
			return SamlToken(**build_token(user).dict(), accountName=user_name)
		else:
			raise_401('Invalid signature')
	else:
		raise_404()
