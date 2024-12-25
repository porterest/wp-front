from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from domain.enums.chain_status import ChainStatus
from domain.models.base import BaseModel

@dataclass(kw_only=True)
class Chain(BaseModel):
    id: UUID
    current_block: int
    last_update: datetime
    created_at: datetime
    status: ChainStatus
