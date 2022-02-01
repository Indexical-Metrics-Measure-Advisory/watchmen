from datetime import timedelta
from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from starlette import status

from watchmen_model.admin import User
from watchmen_model.system import Token
from watchmen_rest import create_jwt_token
from watchmen_rest_doll.doll import doll
from watchmen_rest_doll.util import verify_password
from .auth import build_find_user_by_name

router = APIRouter()
logger = getLogger(__name__)


def authenticate(username, password) -> User:
	# principal is careless
	find_user_by_name = build_find_user_by_name(doll.meta_storage)
	doll.meta_storage.begin()
	try:
		user = find_user_by_name(username)
		if user is None:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")
		if verify_password(password, user.password):
			return user
		else:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")
	finally:
		doll.meta_storage.close()


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

	return Token(
		accessToken=create_jwt_token(
			subject=user.name, expires_delta=access_token_expires,
			secret_key=doll.settings.JWT_SECRET_KEY, algorithm=doll.settings.JWT_ALGORITHM
		),
		tokenType='bearer',
		role=user.role,
		tenantId=user.tenantId
	)
