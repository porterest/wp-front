import asyncio
import logging
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from pytoniq import LiteBalancer, WalletV4R2

from abstractions.services.app_wallet import AppWalletServiceInterface, AppWalletProviderInterface
from abstractions.services.user import UserServiceInterface
from services.app_wallet.provider import AppWalletProvider

logger = logging.getLogger(__name__)


@dataclass
class AppWalletService(AppWalletServiceInterface):
    provider: AppWalletProviderInterface
    user_service: UserServiceInterface = None

    def __post_init__(self):
        self.ton = LiteBalancer.from_mainnet_config(trust_level=1)

    async def get_deposit_address(self) -> Annotated[str, 'Address']:
        address = await self.provider.get_deposit_address()
        return address

    async def withdraw_to_user(self, user_id: UUID, amount: Annotated[float, 'tons to send']):
        user = await self.user_service.get_user(user_id=user_id)

        await self.ton.start_up()

        logger.debug("balancer started")

        withdraw_wallet = await self.provider.get_withdraw_wallet()

        logger.debug("got wallet")

        wallet = await WalletV4R2.from_private_key(
            private_key=withdraw_wallet.private_key.get_secret_value().encode(),
            provider=self.ton,
        )

        logger.debug('instantiated wallet')

        grams = int(amount * 10e8)

        res = await wallet.transfer(
            # destination="UQBVHXhBu2aWGNc0mkztPUSjKc4CWFsCVyuWqspZmLWvUw7J",
            destination=user.wallet_address,
            amount=grams,
        )

        logger.info(f"Transaction with {amount} TON "
                    f"to wallet {user.wallet_address} (USER ID: {user.id}) send with status code {res}"
                    f"(from {wallet.address.to_str(is_user_friendly=False)})")  # False is 20x faster than True

        await self.ton.close_all()

        if res > 1:
            raise Exception("smth went wrong")

        logger.debug("balancer closed")


if __name__ == '__main__':
    provider = AppWalletProvider(
        vault_service=get_vault_service(),
        wallet_repository=get_wallet_repository()
    )

    service = AppWalletService(
        provider=provider,
    )

    asyncio.run(service.withdraw_to_user(UUID('de5b5876-16ea-485b-8ced-6e3611d4b3ff'), amount=0.05))
