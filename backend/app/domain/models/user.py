from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

from domain.models import Balance, Bet, Transaction
from domain.models.base import BaseModel


@dataclass(kw_only=True)
class User(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None

    balances: Optional[List[Balance]] = None
    bets: Optional[List[Bet]] = None
    transactions: Optional[List[Transaction]] = None
