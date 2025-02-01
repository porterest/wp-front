from dataclasses import dataclass
from typing import Optional

from domain.models.liquidity_action import LiquidityAction
from domain.models.reward_model import Rewards


@dataclass(kw_only=True)
class OrchestratorResult:
    mint: Optional[int] = None
    rewards: Optional[Rewards] = None
