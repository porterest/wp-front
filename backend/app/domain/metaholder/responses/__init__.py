from typing import List
from uuid import UUID

from pydantic import BaseModel

from .balance import BalanceResponse
from .bet import BetResponse
from .transaction import TransactionResponse


class UserInfoResponse(BaseModel):
    user_id: UUID
    balances: List[BalanceResponse]


class UserBetsResponse(BaseModel):
    user_id: UUID
    bets: List[BetResponse]


class UserHistoryResponse(BaseModel):
    user_id: UUID
    transactions: List[TransactionResponse]