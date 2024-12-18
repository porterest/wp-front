from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from domain.dto import CreateDTO
from infrastructure.db.entities import ChainStatus

@dataclass
class CreateChainDTO(CreateDTO):
    current_block: int
    status: ChainStatus
    created_at: datetime
    last_update: Optional[datetime] = None

@dataclass
class UpdateChainDTO:
    current_block: Optional[int] = None
    status: Optional[ChainStatus] = None
    last_update: Optional[datetime] = None
