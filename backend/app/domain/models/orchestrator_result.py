from dataclasses import dataclass
from typing import Any, Optional

from domain.models.base import BaseModel


@dataclass(kw_only=True)
class OrchestratorResult(BaseModel):
    liquidity_result: Optional[dict]
    swap_result: Optional[dict]
    rewards_result: Optional[dict]


