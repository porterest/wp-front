from dataclasses import dataclass
from typing import Optional, Annotated

from domain.enums.liquidity_action import LiquidityActionType


@dataclass(kw_only=True)
class LiquidityAction:
    action: LiquidityActionType
    amount: Optional[Annotated[float, 'lp tokens share to burn if removing, TON part of tx if adding, None if hold']] = None  # noqa
