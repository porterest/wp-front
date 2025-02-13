import typing
from dataclasses import dataclass
from typing import TypeVar, Annotated, Optional
from uuid import UUID

from domain.enums import BetStatus
from domain.models.base import BaseModel

BetVector = TypeVar('BetVector', bound=tuple[
    Annotated[float, 'price'],
    Annotated[float, 'bets amount'],
])

if typing.TYPE_CHECKING:
    from domain.models.user import User
    from domain.models.pair import Pair


@dataclass(kw_only=True)
class Bet(BaseModel):
    user: Optional['User'] = None
    pair: Optional['Pair'] = None
    amount: float
    block_number: int
    vector: BetVector
    status: BetStatus
    reward: Optional[float]

    user_id: Optional[UUID] = None
