from dataclasses import dataclass
from uuid import UUID

from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.inner_token import InnerTokenInterface
from abstractions.services.tonclient import TonClientInterface


@dataclass
class InnerTokenService(InnerTokenInterface):
    ton_client: TonClientInterface
    user_repository: UserRepositoryInterface

    async def mint(self, amount: int):
        await self.ton_client.mint(amount)

    async def withdraw_to_user(self, amount: int, user_id: UUID):
        user = await self.user_repository.get(user_id)
        await self.ton_client.withdraw_to_user(amount, user.wallet_address)
