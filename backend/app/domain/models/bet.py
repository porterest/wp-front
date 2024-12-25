import typing
from dataclasses import dataclass
from typing import TypeVar, Annotated

from domain.enums import BetStatus
from domain.models import Pair
from domain.models.base import BaseModel

BetVector = TypeVar('BetVector', bound=tuple[
    Annotated[float, 'price'],
    Annotated[float, 'bets amount'],
])

if typing.TYPE_CHECKING:
    from domain.models.user import User


@dataclass
class Bet(BaseModel):
    user: 'User'
    pair: Pair
    amount: float
    block_number: int
    vector: BetVector
    status: BetStatus
