from datetime import timedelta
from logging import getLogger
from typing import Optional, Union

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from starlette.requests import Request

from watchmen_auth import AuthenticationScheme, PrincipalService
from watchmen_meta.admin import UserService
from watchmen_meta.auth import build_find_user_by_name
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User
from watchmen_model.system import Token
from watchmen_rest import create_jwt_token, get_any_principal, retrieve_authentication_manager
from watchmen_rest.util import raise_401
from watchmen_rest_doll.doll import ask_access_token_expires_in, ask_jwt_params, ask_saml2_enabled, ask_saml2_settings, \
	ask_sso_enabled
from watchmen_rest_doll.settings import SSOTypes
from watchmen_rest_doll.util import verify_password

router = APIRouter()
logger = getLogger(__name__)


class LoginConfiguration(BaseModel):
	method: Union[str, SSOTypes] = SSOTypes.DOLL,
	url: Optional[str] = None


@router.get('/auth/config', tags=['authenticate'], response_model=LoginConfiguration)
async def load_login_config(request: Request) -> LoginConfiguration:
	if ask_sso_enabled() and ask_saml2_enabled():
		from watchmen_rest_doll.sso.saml.saml_helper import prepare_from_fastapi_request
		# noinspection PyPackageRequirements
		from onelogin.saml2.auth import OneLogin_Saml2_Auth

		req = await prepare_from_fastapi_request(request)
		auth = OneLogin_Saml2_Auth(req, ask_saml2_settings())
		callback_url = auth.login()
		return LoginConfiguration(method=SSOTypes.SAML2, url=callback_url)
	else:
		return LoginConfiguration(method=SSOTypes.DOLL)


def authenticate(username, password) -> User:
	# principal is careless
	find_user_by_name = build_find_user_by_name(False)
	user = find_user_by_name(username)
	if user is None:
		raise_401('Incorrect username or password.')
	if not user.isActive:
		# hide failure details
		raise_401('Incorrect username or password.')
	if verify_password(password, user.password):
		return user
	else:
		raise_401('Incorrect username or password.')


@router.post('/login', response_model=Token, tags=['authenticate'])
async def login_by_user_pwd(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
	"""
	OAuth2 compatible token login, get an access token for future requests
	"""
	user: User = authenticate(form_data.username, form_data.password)
	logger.info(f'User[{user.name}] signed in.')
	access_token_expires = timedelta(minutes=ask_access_token_expires_in())
	jwt_secret_key, jwt_algorithm = ask_jwt_params()
	return Token(
		accessToken=create_jwt_token(
			subject=user.name, expires_delta=access_token_expires,
			secret_key=jwt_secret_key, algorithm=jwt_algorithm
		),
		tokenType='bearer',
		role=user.role,
		tenantId=user.tenantId
	)


@router.get('/token/validate/jwt', response_model=User, tags=['authenticate'])
async def validate_jwt_token(token: str) -> User:
	"""
	Validate given token, returns user of this token when validated
	"""
	return retrieve_authentication_manager().authenticate(AuthenticationScheme.JWT.value, token)


@router.get('/token/exchange-user', response_model=User, tags=['authenticate'])
async def exchange_user(principal_service: PrincipalService = Depends(get_any_principal)) -> Optional[User]:
	"""
	returns current principal
	"""
	user_id = principal_service.get_user_id()
	user_service = UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	user_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		user: User = user_service.find_by_id(user_id)
		if user is None:
			return None
		else:
			del user.password
			return user
	finally:
		user_service.close_transaction()
