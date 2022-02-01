from passlib.context import CryptContext

PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")


def crypt_password(password: str) -> str:
	return PWD_CONTEXT.hash(password)
