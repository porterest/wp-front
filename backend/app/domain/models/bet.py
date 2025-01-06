import typing
from dataclasses import dataclass
from typing import TypeVar, Annotated

from domain.enums import BetStatus
from domain.models import Pair
from domain.models.base import BaseModel

BetVector = TypeVar('BetVector', bound=tuple[
    Annotated[float, 'price'],
    Annotated[int, 'bets amount'],
])

if typing.TYPE_CHECKING:
    from domain.models.user import User


@dataclass(kw_only=True)
class Bet(BaseModel):
    user: typing.Optional['User'] = None
    pair: Pair
    amount: float
    block_number: int
    vector: BetVector
    status: BetStatus
