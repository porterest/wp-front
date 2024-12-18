from pydantic import BaseModel


class TonApiPublicKeyResponse(BaseModel):
    public_key: str
