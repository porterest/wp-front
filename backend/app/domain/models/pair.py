from dataclasses import dataclass
from typing import Optional

from domain.models.base import BaseModel


@dataclass(kw_only=True)
class Pair(BaseModel):
    name: str
    contract_address: Optional[str] = None
    last_ratio: Optional[float] = None
