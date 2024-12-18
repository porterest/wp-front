from pydantic import BaseModel


class GeneratePayloadResponse(BaseModel):
    payload: str


class CheckProofResponse(BaseModel):
    token: str
