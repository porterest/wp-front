from uuid import UUID

from pydantic import BaseModel


class GetUserLastBetRequest(BaseModel):
    pair_id: UUID
