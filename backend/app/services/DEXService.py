import logging
from typing import Annotated
from uuid import UUID
from domain.dex import PoolState
from domain.models.liquidity_action import LiquidityAction

logger = logging.getLogger(__name__)
class MockDexService:
    async def get_pool_balance(self) -> tuple[float, float]:
        # Mocking a tuple of pool balances: token1 and token2
        return (5000.0, 10000.0)

    async def burn_lp_tokens(self):
        # Mock action for burning liquidity provider tokens
        logger.info("LP tokens burned successfully.")

    async def get_pool_state(self) -> PoolState:
        # Returning a mocked pool state
        return PoolState(pool_size=15000.0, token_ratio=0.5)

    async def get_current_liquidity(self, pair_id: UUID) -> Annotated[float, 'Mock Liquidity']:
        # Returning a mock liquidity value for the given pair_id
        return 12345.67

    def get_pool_balances(self) -> list[float]:
        # Mock pool balances
        return [12121.0, 333.0]

    def get_pool_activity(self) -> float:
        # Mock activity data
        return 45.6

    def perform_swap(self, pool_state_delta: dict[str, float]) -> None:
        # Simulate performing a swap
        logger.info(f"Performed swap with delta: {pool_state_delta}")

    def perform_liquidity_action(self, liquidity_action: LiquidityAction, pool_state_delta: dict[str, float]) -> None:
        # Simulate performing a liquidity action
        logger.info(f"Performed liquidity action: {liquidity_action} with delta: {pool_state_delta}")
