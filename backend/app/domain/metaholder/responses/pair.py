from uuid import UUID

from pydantic import BaseModel


class PairResponse(BaseModel):
    pair_id: UUID
    name: str
