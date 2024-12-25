from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from domain.dto import CreateDTO


@dataclass
class CreatePairDTO(CreateDTO):
    name: str
    contract_address: str
    last_ratio: str


class UpdatePairDTO(BaseModel):
    name: Optional[str] = None
    contract_address: Optional[str] = None
    last_ratio: Optional[float] = None
