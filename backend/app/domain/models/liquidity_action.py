from dataclasses import dataclass
from typing import Optional, Annotated

from domain.enums.liquidity_action import LiquidityActionType


@dataclass(kw_only=True)
class TokenState:
    name: str
    state_after: float
    delta: float


@dataclass(kw_only=True)
class LiquidityAction:
    action: LiquidityActionType
    states: Optional[dict[
        Annotated[str, 'token symbol'],
        TokenState,
    ]] = None
