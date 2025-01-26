from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from domain.enums.chain_status import ChainStatus
from domain.models.base import BaseModel


@dataclass(kw_only=True)
class Chain(BaseModel):
    id: UUID
    pair_id: UUID
    current_block: int
    created_at: datetime
    status: ChainStatus
