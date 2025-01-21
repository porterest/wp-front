from dataclasses import dataclass
from uuid import UUID

from pytoniq import Address

from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.inner_token import InnerTokenInterface
from abstractions.services.tonclient import TonClientInterface


@dataclass
class InnerTokenService(InnerTokenInterface):
    ton_client: TonClientInterface
    user_repository: UserRepositoryInterface
    app_wallet_provider: AppWalletServiceInterface

    token_minter_address: Address = Address('EQBrltnukNOtAPgUwUO5o6VlDuFv2pkzEkOPvnqmOe2OmdB3')

    async def mint(self, amount: int):
        admin_wallet = await self.app_wallet_provider.get_withdraw_wallet()
        await self.ton_client.mint(
            amount=amount,
            token_address=self.token_minter_address,
            admin_wallet=admin_wallet,
        )

    async def withdraw_to_user(self, amount: int, user_id: UUID):
        user = await self.user_repository.get(user_id)
        app_wallet = await self.app_wallet_provider.get_withdraw_wallet()
        await self.ton_client.send_jettons(
            amount=amount,
            user_wallet_address=Address(user.wallet_address),
            token_address=self.token_minter_address,
            app_wallet=app_wallet,
        )
