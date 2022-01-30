from typing import Tuple

from fastapi import HTTPException
from starlette import status
from starlette.requests import Request

from watchmen_auth import Authorization, PrincipalService
from watchmen_model.admin import UserRole
from ..doll import doll


def parse_token(request: Request) -> Tuple[str, str]:
	# scheme, token = get_authorization_scheme_param(authorization)
	# return scheme, token
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


def get_principal(request: Request, role: UserRole) -> PrincipalService:
	scheme, token = parse_token(request)
	if scheme == 'Bearer':
		return PrincipalService(Authorization(doll.authentication_manager, role).authorize_by_jwt(token))
	elif scheme == 'PAT':
		return PrincipalService(Authorization(doll.authentication_manager, role).authorize_by_pat(token))
	else:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Not authenticated",
			headers={"WWW-Authenticate": "Bearer"},
		)


def get_console_principal(request: Request) -> PrincipalService:
	return get_principal(request, UserRole.CONSOLE)


def get_admin_principal(request: Request) -> PrincipalService:
	return get_principal(request, UserRole.ADMIN)


def get_super_admin_principal(request: Request) -> PrincipalService:
	return get_principal(request, UserRole.SUPER_ADMIN)

# username = get_username(scheme, token)
#
# user = load_user_by_name(username)
#
# if settings.DEFAULT_DATA_ZONE_ON:
# 	user.tenantId = "1"
#
# if not user:
# 	raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
#
# return user


# def get_username(scheme, token):
# 	if scheme.lower() == "bearer":
# 		try:
# 			payload = validate_jwt(token)
# 		except (jwt.JWTError, ValidationError):
# 			raise HTTPException(
# 				status_code=status.HTTP_401_UNAUTHORIZED,
# 				detail="Could not validate credentials",
# 			)
# 		return payload["sub"]
# 	elif scheme.lower() == "pat":
# 		pat: PersonAccessToken = verifyPAT(token)
# 		if pat is not None:
# 			return pat.username
# 		else:
# 			raise HTTPException(
# 				status_code=status.HTTP_401_UNAUTHORIZED,
# 				detail="Could not validate credentials",
# 			)
