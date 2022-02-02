from datetime import timedelta
from logging import getLogger
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from starlette.requests import Request

from watchmen_auth import AuthFailOn401, AuthFailOn403, Authorization, PrincipalService
from watchmen_meta_service.admin import UserService
from watchmen_model.admin import User, UserRole
from watchmen_model.system import Token
from watchmen_rest import create_jwt_token
from watchmen_rest.util import raise_401, raise_403
from watchmen_rest_doll.doll import ask_access_token_expires_in, ask_jwt_params, ask_meta_storage, \
	ask_snowflake_generator, doll
from watchmen_rest_doll.util import build_find_user_by_name, verify_password
from watchmen_storage import TransactionalStorageSPI

router = APIRouter()
logger = getLogger(__name__)


def parse_token(request: Request) -> Tuple[str, str]:
	authorization: str = request.headers.get("Authorization")

	if not authorization:
		raise_401('Unauthorized caused by token not found.', {"WWW-Authenticate": "Bearer"})
	else:
		scheme, _, param = authorization.partition(" ")
		token = param
		return scheme, token


def get_principal(request: Request, roles: List[UserRole]) -> PrincipalService:
	scheme, token = parse_token(request)
	try:
		if scheme == 'Bearer':
			return PrincipalService(Authorization(doll.authentication_manager, roles).authorize_by_jwt(token))
		elif scheme == 'PAT':
			return PrincipalService(Authorization(doll.authentication_manager, roles).authorize_by_pat(token))
		else:
			raise AuthFailOn401()
	except AuthFailOn403:
		raise_403()
	except AuthFailOn401:
		raise_401('Unauthorized caused by unrecognized token.')


def get_any_principal(request: Request) -> PrincipalService:
	return get_principal(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONSOLE])


def get_console_principal(request: Request) -> PrincipalService:
	return get_principal(request, [UserRole.ADMIN, UserRole.CONSOLE])


def get_admin_principal(request: Request) -> PrincipalService:
	return get_principal(request, [UserRole.ADMIN])


def get_any_admin_principal(request: Request) -> PrincipalService:
	return get_principal(request, [UserRole.ADMIN, UserRole.SUPER_ADMIN])


def get_super_admin_principal(request: Request) -> PrincipalService:
	return get_principal(request, [UserRole.SUPER_ADMIN])


def authenticate(username, password) -> User:
	storage: TransactionalStorageSPI = ask_meta_storage()
	# principal is careless
	find_user_by_name = build_find_user_by_name(storage, False)
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


@router.post('/login/access-token', response_model=Token, tags=['authenticate'])
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
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


@router.get("/login/validate-token", response_model=User, tags=["authenticate"])
async def validate_token(token: str) -> User:
	"""
	Validate given token, returns user of this token when validated
	"""
	return doll.authentication_manager.authenticate_by_jwt(token)


@router.get("/login/test-token", response_model=User, tags=["authenticate"])
async def test_token(principal_service: PrincipalService = Depends(get_any_principal)) -> Optional[User]:
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
