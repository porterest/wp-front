from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from pytoniq import Address

from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.inner_token import InnerTokenInterface
from abstractions.services.tonclient import TonClientInterface
from services.ton.client.base import AbstractBaseTonClient


@dataclass
class InnerTokenService(InnerTokenInterface):
    ton_client: TonClientInterface
    user_repository: UserRepositoryInterface
    app_wallet_provider: AppWalletServiceInterface

    token_minter_address_str: str

    token_minter_address: Optional[Address] = None

    def __post_init__(self):
        self.token_minter_address = Address(self.token_minter_address_str)

    async def get_token_price(self, pool_address: str) -> float:
        state = await self.ton_client.get_pool_reserves(Address(pool_address))
        return state[0] / state[1]

    async def mint(self, amount: float):
        admin_wallet = await self.app_wallet_provider.get_withdraw_wallet()
        amount = AbstractBaseTonClient.to_nano(amount)
        await self.ton_client.mint(
            amount=amount,
            token_address=self.token_minter_address,
            admin_wallet=admin_wallet,
        )

    async def withdraw_to_user(self, amount: float, user_id: UUID):
        ...
    #     user = await self.user_repository.get(user_id)
    #     app_wallet = await self.app_wallet_provider.get_withdraw_wallet()
    #     amount = AbstractBaseTonClient.to_nano(amount)
        # await self.ton_client.send_jettons(
        #     amount=amount,
        #     user_wallet_address=Address(user.wallet_address),
        #     token_address=self.token_minter_address,
        #     app_wallet=app_wallet,
        # )

    async def add_liquidity(self):
        ...

    async def remove_liquidity(self):
        ...
