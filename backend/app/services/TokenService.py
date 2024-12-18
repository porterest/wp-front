import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import uuid4

import jwt
from jwt import (decode, encode,
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
            self.get_token_payload(token)
            return True
        except ExpiredSignatureJWTError:
            logger.error("Token has expired: %s", token)
        except InvalidTokenJWTError as ex:
            logger.error("Invalid token: %s. Error: %s", token, ex)
        finally:
            return False

    def create_payload_token(self, ttl: int = 600) -> str:
        claims = {
            "sub": str(uuid4()),
            "exp": datetime.now() + timedelta(seconds=ttl),  # payload ttl is not the same as general jwt ttl
        }

        return self.create_token(**claims)

    def create_auth_token(self, wallet_address: str, payload: str) -> AuthTokens:
        access_claims = {
            'sub': wallet_address,
            'payload': payload,
            'exp': datetime.now() + timedelta(seconds=self.jwt_settings.access_expire),
        }

        refresh_claims = {
            'sub': wallet_address,
            'payload': payload,
            'exp': datetime.now() + timedelta(seconds=self.jwt_settings.refresh_expire),
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

        token = encode(
            payload=claims,
            key=self.jwt_settings.secret_key,
            algorithm="HS256"
        )

        return token

    def get_token_payload(self, token: str) -> dict:
        try:
            claims = decode(
                token,
                self.jwt_settings.secret_key,
                algorithms=["HS256"],
                issuer=self.jwt_settings.issuer,
                audience=self.jwt_settings.audience,
                options={
                    "verify_exp": True
                },
            )

            return claims
        except ExpiredSignatureJWTError as ex:
            logger.error("Token has expired: %s", token)
            raise ExpiredTokenException from ex
        except InvalidTokenJWTError as ex:
            logger.error("Invalid token: %s. Error: %s", token, ex)
            raise InvalidTokenException from ex
