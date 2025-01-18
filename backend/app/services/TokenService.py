import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC
from uuid import uuid4

from jwt import (
    decode, encode,
    ExpiredSignatureError as ExpiredSignatureJWTError,
    InvalidTokenError as InvalidTokenJWTError
)

from abstractions.services.auth.tokens import TokenServiceInterface
from domain.dto.auth import AuthTokens
from services.exceptions import InvalidTokenException, ExpiredTokenException
from settings import JwtSettings

logger = logging.getLogger(__name__)


@dataclass
class TokenService(TokenServiceInterface):
    jwt_settings: JwtSettings

    def validate_token(self, token: str) -> bool:
        try:
            claims = self.get_token_payload(token)
            logger.error(f"validating {claims.get('exp')}")
            return True
        except ExpiredSignatureJWTError:
            logger.error("Token has expired: %s", token)
        except InvalidTokenJWTError as ex:
            logger.error("Invalid token: %s. Error: %s", token, ex)
        return False

    def create_payload_token(self, ttl: int = 600) -> str:
        claims = {
            "sub": str(uuid4()),
            "exp": datetime.now(tz=UTC) + timedelta(seconds=ttl),  # payload ttl is not the same as general jwt ttl
        }

        return self.create_token(**claims)

    def create_auth_token(self, wallet_address: str, payload: str) -> AuthTokens:
        access_claims = {
            'sub': wallet_address,
            'payload': payload,
            'exp': datetime.now(tz=UTC) + timedelta(seconds=self.jwt_settings.access_expire),
        }

        logger.error(f"creating {access_claims['exp']}")

        refresh_claims = {
            'sub': wallet_address,
            'payload': payload,
            'exp': datetime.now(tz=UTC) + timedelta(seconds=self.jwt_settings.refresh_expire),
        }

        return AuthTokens(
            access_token=self.create_token(**access_claims),
            refresh_token=self.create_token(**refresh_claims),
        )

    def create_token(self, **claims) -> str:
        if 'iss' not in claims:
            claims["iss"] = self.jwt_settings.issuer

        if 'aud' not in claims:
            claims["aud"] = self.jwt_settings.audience

        exp = claims['exp']
        if isinstance(exp, datetime):
            logger.error(exp)
        elif isinstance(exp, int):
            logger.error(datetime.fromtimestamp(exp))
        else:
            logger.error(type(exp))

        token = encode(
            payload=claims,
            key=self.jwt_settings.secret_key.get_secret_value(),
            algorithm="HS256"
        )

        logger.error(f"token created, {token}, {claims}")
        decoded = decode(
            token,
            key=self.jwt_settings.secret_key.get_secret_value(),
            algorithms=["HS256"],
            options={'verify_aud': False},
        )
        logger.error(decoded)

        return token

    def get_token_payload(self, token: str) -> dict:
        try:
            claims = decode(
                token,
                self.jwt_settings.secret_key.get_secret_value(),
                algorithms=["HS256"],
                issuer=self.jwt_settings.issuer,
                audience=self.jwt_settings.audience,
                options={
                    "verify_exp": True
                },
            )
            logger.error(f"token exp is {claims.get('exp')}, token is {token}")

            return claims
        except ExpiredSignatureJWTError as ex:
            logger.error("Token has expired: %s", token)
            raise ExpiredTokenException from ex
        except InvalidTokenJWTError as ex:
            logger.error("Invalid token: %s. Error: %s", token, ex)
            raise InvalidTokenException from ex
