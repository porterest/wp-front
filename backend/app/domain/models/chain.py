import typing
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from domain.enums.chain_status import ChainStatus
from domain.models.base import BaseModel

if typing.TYPE_CHECKING:
    from domain.models.pair import Pair


@dataclass(kw_only=True)
class Chain(BaseModel):
    id: UUID
    pair_id: UUID
    current_block: int
    created_at: datetime
    status: ChainStatus

    pair: Optional['Pair'] = None
