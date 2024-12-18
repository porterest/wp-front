from pydantic import BaseModel, SecretStr


class Credentials(BaseModel):
    wallet_address: str
    payload: str


class AuthTokens(BaseModel):
    access_token: SecretStr
    refresh_token: SecretStr
