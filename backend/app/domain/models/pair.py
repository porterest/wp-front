from dataclasses import dataclass

from domain.models.base import BaseModel


@dataclass
class Pair(BaseModel):
    name: str
    contract_address: str
    last_ratio: float
