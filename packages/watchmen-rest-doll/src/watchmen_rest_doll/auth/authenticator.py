from datetime import timedelta
from logging import getLogger
from typing import List, Tuple

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from starlette import status
from starlette.requests import Request

from watchmen_auth import AuthFailOn401, AuthFailOn403, Authorization, PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.system import Token
from watchmen_rest import create_jwt_token
from watchmen_rest_doll.doll import ask_jwt_params, ask_meta_storage, doll
from watchmen_rest_doll.util import build_find_user_by_name, verify_password
from watchmen_storage import TransactionalStorageSPI

router = APIRouter()
logger = getLogger(__name__)


def parse_token(request: Request) -> Tuple[str, str]:
	authorization: str = request.headers.get("Authorization")

	if not authorization:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Not authenticated",
			headers={"WWW-Authenticate": "Bearer"},
		)
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
			raise AuthFailOn401('Unauthorized on undetected token.')
	except AuthFailOn403:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authenticated")
	except AuthFailOn401:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


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
	find_user_by_name = build_find_user_by_name(storage)
	storage.begin()
	try:
		user = find_user_by_name(username)
		if user is None:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")
		if verify_password(password, user.password):
			return user
		else:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")
	finally:
		storage.close()


@router.post("/login/access-token", response_model=Token, tags=["authenticate"])
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
	"""
	OAuth2 compatible token login, get an access token for future requests
	"""
	user: User = authenticate(form_data.username, form_data.password)

	if not user:
		raise HTTPException(status_code=400, detail="Incorrect username or password.")
	elif not user.isActive:
		# hide failure details
		raise HTTPException(status_code=400, detail="Incorrect username or password.")

	logger.info(f'User[{user.name}] signed in.')

	access_token_expires = timedelta(minutes=doll.settings.ACCESS_TOKEN_EXPIRE_MINUTES)

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
