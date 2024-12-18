from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from domain.dto import CreateDTO


@dataclass
class CreateUserDTO(CreateDTO):
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    last_activity: Optional[datetime]


@dataclass
class UpdateUserDTO:
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None
