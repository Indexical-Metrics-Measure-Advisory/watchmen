import urllib.parse
from datetime import timedelta
from typing import Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.x509 import load_pem_x509_certificate
from onelogin.saml2.utils import OneLogin_Saml2_Utils
from onelogin.saml2.xml_utils import OneLogin_Saml2_XML

from watchmen_meta.auth import build_find_user_by_name
from watchmen_model.admin import User
from watchmen_model.system import Token
from watchmen_rest import create_jwt_token


USERNAME_PATH = "/samlp:Response/saml:Assertion/saml:AttributeStatement/saml:Attribute[@Name='username']/saml:AttributeValue"


def verify_signature(saml_response, algorithm, signature, relay_state, settings):
    cert = settings["idp"]["x509cert"]
    cert_str = OneLogin_Saml2_Utils.format_cert(cert)
    cert_obj = load_pem_x509_certificate(str.encode(cert_str), default_backend())
    public_key = cert_obj.public_key()
    decode_signature = OneLogin_Saml2_Utils.b64decode(signature)
    query = build_query_data(algorithm, relay_state, saml_response)

    try:
        public_key.verify(decode_signature, query.encode(), padding.PKCS1v15(), hashes.SHA256())
        return True
    except Exception as e:
        print(e)
        return False


def build_query_data(algorithm, relay_state, saml_response):
    query = "SAMLResponse=" + urllib.parse.quote_plus(saml_response) + "&RelayState=" + urllib.parse.quote_plus(
        relay_state) + "&SigAlg=" + urllib.parse.quote_plus(algorithm)
    return query


def get_user_name_in_saml_body(saml_response: str) -> str:
    saml_xml = OneLogin_Saml2_Utils.decode_base64_and_inflate(saml_response)
    document = OneLogin_Saml2_XML.to_etree(saml_xml)
    dom = OneLogin_Saml2_XML.query(document, USERNAME_PATH)
    if len(dom) == 0:
        raise ValueError("Invalid SAML Response")
    else:
        user_name = dom[0].text
        return user_name


async def prepare_from_fastapi_request(request, debug=False):
    form_data = await request.form()

    rv = {
        "http_host": request.client.host,
        "server_port": request.url.port,
        "script_name": request.url.path,
        "post_data": {},
        "get_data": {}
    }

    if request.query_params:
        rv["get_data"] = request.query_params,
    if "SAMLResponse" in form_data:
        saml_response = form_data["SAMLResponse"]
        rv["post_data"]["SAMLResponse"] = saml_response
    if "RelayState" in form_data:
        relay_state = form_data["RelayState"]
        rv["post_data"]["RelayState"] = relay_state
    return rv


def find_user(user_name: str) -> Optional[User]:
    find_user_by_name = build_find_user_by_name(False)
    return find_user_by_name(user_name)


def build_token(user: User, settings):
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        accessToken=create_jwt_token(
            subject=user.name, expires_delta=access_token_expires,
            secret_key=settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        ),
        tokenType='bearer',
        role=user.role,
        tenantId=user.tenantId
    )
