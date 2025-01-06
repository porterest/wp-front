from dataclasses import dataclass
from typing import Annotated, TypeVar

PoolBalances = TypeVar(
    'PoolBalances',
    bound=dict[
        Annotated[str, 'token symbol'],
        Annotated[float, 'amount'],
    ]
)


@dataclass
class PoolState:
    balances: PoolBalances
    price: float
