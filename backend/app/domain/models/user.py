from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

from domain.models.base import BaseModel
from domain.models.bet import Bet
from domain.models.transaction import Transaction


@dataclass(kw_only=True)
class User(BaseModel):
    telegram_id: Optional[int] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    last_activity: Optional[datetime] = None
    wallet_address: Optional[str] = None
    balance: Optional[float] = None
    bets: Optional[List[Bet]] = None
    transactions: Optional[List[Transaction]] = None


@dataclass(kw_only=True)
class BettingActivity:
    count: int
    volume: float
