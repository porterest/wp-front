from pydantic import BaseModel


class GeneratePayloadResponse(BaseModel):
    payload: str
