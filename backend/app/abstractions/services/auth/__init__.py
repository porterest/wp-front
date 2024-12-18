from abc import ABC, abstractmethod
from uuid import UUID

from domain.dto.auth import AuthTokens, Credentials


class AuthServiceInterface(ABC):
    @abstractmethod
    async def get_user_id_from_jwt(self, token: str) -> UUID:
        ...

    @abstractmethod
    async def create_token(self, credentials: Credentials) -> AuthTokens:
        ...

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> AuthTokens:
        ...
