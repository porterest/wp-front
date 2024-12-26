from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from domain.dto import CreateDTO


@dataclass(kw_only=True)
class CreateUserDTO(CreateDTO):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None
    wallet_address: str


class UpdateUserDTO(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None
    wallet_address: Optional[str] = None
    balance: Optional[float] = None
