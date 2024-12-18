from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple

from domain.dto import CreateDTO
from infrastructure.db.entities import BlockStatus


@dataclass
class CreateBlockDTO(CreateDTO):
    block_number: int
    status: BlockStatus
    result_vector: Tuple[float, float]
    created_at: Optional[datetime]
    completed_at: Optional[str] = None


@dataclass
class UpdateBlockDTO:
    status: Optional[BlockStatus]
    result_vector: Optional[Tuple[float, float]]
    completed_at: Optional[str]
