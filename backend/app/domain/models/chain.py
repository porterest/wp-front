from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from domain.models.base import BaseModel

@dataclass(kw_only=True)
class Chain(BaseModel):
    id: str
    current_block: int
    last_update: datetime
    created_at: datetime
    status: str
