from dataclasses import dataclass
from typing import Optional

from domain.models.liquidity_action import LiquidityAction
from domain.models.reward_model import Rewards
from domain.models.swap import CalculatedSwap
from domain.ton.transaction import TonTransaction


@dataclass(kw_only=True)
class OrchestratorResult:
    liquidity_action: Optional[LiquidityAction] = None
    swap: Optional[CalculatedSwap] = None
    swap_result: Optional[TonTransaction] = None
    rewards: Optional[Rewards] = None
