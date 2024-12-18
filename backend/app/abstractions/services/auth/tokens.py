import logging
from abc import ABC, abstractmethod

from domain.dto.auth import AuthTokens

logger = logging.getLogger(__name__)


class TokenServiceInterface(ABC):
    @abstractmethod
    def validate_token(self, token: str) -> bool:
        """
        Validates a JWT token.
        """
        ...

    @abstractmethod
    def get_token_payload(self, token: str) -> dict:
        ...

    @abstractmethod
    def create_payload_token(self, ttl: int) -> str:
        """
        Creates a JWT token with a payload containing a unique identifier.
        """
        ...

    @abstractmethod
    def create_token(self, **claims) -> str:
        """
        Creates a JWT token with the specified payload and address.
        """
        ...

    @abstractmethod
    def create_auth_token(self, wallet_address: str, payload: str) -> AuthTokens:
        """
        Creates a JWT auth token for provided credentials. If invalid raises InvalidTokenError
        :param wallet_address: User's wallet address
        :param payload: Payload token. If expired, InvalidPayloadToken is raised
        :return: Default application tokens
        """
        ...
