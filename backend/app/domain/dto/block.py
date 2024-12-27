from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID

from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.models.bet import BetVector
from infrastructure.db.entities import BlockStatus


@dataclass(kw_only=True)
class CreateBlockDTO(CreateDTO):
    block_number: int
    status: BlockStatus
    chain_id: UUID
    result_vector: Optional[BetVector] = None
    created_at: Optional[datetime]
    completed_at: Optional[datetime] = None


class UpdateBlockDTO(BaseModel):
    status: Optional[BlockStatus] = None
    result_vector: Optional[Tuple[float, float]] = None
    completed_at: Optional[datetime] = None
