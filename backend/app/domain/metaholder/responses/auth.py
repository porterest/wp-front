from pydantic import BaseModel, Field


class AuthResponse(BaseModel):
    access_token: str = Field(serialization_alias='accessToken')
    refresh_token: str = Field(serialization_alias='refreshToken')
    # user_id: UUID
    # user_name: str
