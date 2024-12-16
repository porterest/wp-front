from pydantic import BaseModel, Field
from typing import Optional


class Domain(BaseModel):
    length_bytes: int = Field(alias="LengthBytes")
    value: str


class Proof(BaseModel):
    timestamp: int
    domain: Domain
    signature: str
    payload: str
    state_init: Optional[str] = Field(default=None, alias="state_init")


class CheckProofRequest(BaseModel):
    address: str
    network: str
    public_key: str
    proof: Proof
