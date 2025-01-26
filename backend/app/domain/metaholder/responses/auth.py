from uuid import UUID

from pydantic import BaseModel, SecretStr


class AuthResponse(BaseModel):
    accessToken: SecretStr
    refreshToken: SecretStr
    user_id: UUID
    user_name: str
