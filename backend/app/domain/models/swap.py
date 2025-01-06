from dataclasses import dataclass

from domain.models.base import BaseModel
from domain.models.block import Block


@dataclass
class Swap(BaseModel):
    block: Block
    target_price: float
    amount: float


@dataclass
class CalculatedSwap:
    volume: float
    target_token: str
