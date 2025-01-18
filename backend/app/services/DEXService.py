import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.dex import DexServiceInterface
from domain.dex import PoolState
from domain.models.liquidity_action import LiquidityAction
from domain.ton.transaction import TonTransaction, TonTransactionStatus

logger = logging.getLogger(__name__)


@dataclass
class MockDexService(DexServiceInterface):  # todo: mock
    app_wallet_service: AppWalletServiceInterface

    async def get_pool_balance(self) -> tuple[float, float]:
        # Mocking a tuple of pool balances: token1 and token2
        return (5000.0, 10000.0)

    async def burn_lp_tokens(self):
        # Mock action for burning liquidity provider tokens
        logger.info("LP tokens burned successfully.")

    async def get_pool_state(self) -> PoolState:
        # Returning a mocked pool state
        return PoolState(
            price=10.2,
            balances={
                'TON': 10,
                'X': 20,
            }
        )

    async def get_current_liquidity(self, pair_id: UUID) -> Annotated[float, 'Mock Liquidity']:
        # Returning a mock liquidity value for the given pair_id
        return 12345.67

    def get_pool_balances(self) -> list[float]:
        # Mock pool balances
        return [12121.0, 333.0]

    async def get_pool_activity(self, pair_id: UUID) -> float:
        # Mock activity data
        return 45.6

    async def perform_swap(
            self,
            pool_address: str,
            target_token: str,
            amount: float,
            app_wallet_id: UUID,
    ) -> TonTransaction:
        # Simulate performing a swap
        logger.info(f"Performing swap: sending {amount} {target_token} from {app_wallet_id} to {pool_address}")
        wallet = await self.app_wallet_service.get_wallet(app_wallet_id)
        return TonTransaction(
            from_address=wallet.address,
            to_address=pool_address,
            amount=int(amount * 1e8),
            token=f'other from {target_token}',
            sent_at=datetime.now(),
            status=TonTransactionStatus.COMPLETED,
            tx_id=str(uuid4()),
        )

    async def perform_liquidity_action(self, liquidity_action: LiquidityAction) -> None:
        # Simulate performing a liquidity action
        logger.info(f"Performed liquidity action: {liquidity_action}")

    async def mint_token(self, amount: int):
        ...
    #todo: минт
