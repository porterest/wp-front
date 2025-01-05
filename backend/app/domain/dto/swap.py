from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from domain.dto import CreateDTO
from domain.models.block import Block


@dataclass
class CreateSwapDTO(CreateDTO):
    block: Block
    target_price: float
    amount: float

@dataclass
class UpdateSwapDTO(BaseModel):
    target_price: Optional[float] = None
    amount: Optional[float] = None
