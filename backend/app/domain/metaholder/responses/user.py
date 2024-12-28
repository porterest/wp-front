from typing import List
from uuid import UUID

from pydantic import BaseModel, Field

from domain.metaholder.responses import BetResponse, TransactionResponse


class UserBetsResponse(BaseModel):
    user_id: UUID
    bets: List[BetResponse]


class UserHistoryResponse(BaseModel):
    user_id: UUID
    transactions: List[TransactionResponse]


class UserInfoResponse(BaseModel):
    user_id: UUID
    balance: float
    at_risk: float = Field(serialization_alias='atRisk')
