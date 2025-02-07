from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from pytoniq import Address

from abstractions.repositories.block import BlockRepositoryInterface
from abstractions.repositories.transaction import TransactionRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.inner_token import InnerTokenInterface
from abstractions.services.tonclient import TonClientInterface
from domain.dto.transaction import CreateTransactionDTO
from domain.enums import TransactionType
from services.ton.client.base import AbstractBaseTonClient


@dataclass
class InnerTokenService(InnerTokenInterface):
    ton_client: TonClientInterface
    user_repository: UserRepositoryInterface
    block_repository: BlockRepositoryInterface
    transaction_repository: TransactionRepositoryInterface
    app_wallet_provider: AppWalletServiceInterface

    token_minter_address_str: str

    token_minter_address: Optional[Address] = None

    def __post_init__(self):
        self.token_minter_address = Address(self.token_minter_address_str)

    async def get_token_price(self, pool_address: str) -> float:
        last_block = await self.block_repository.get_last_block_by_contract_address(pool_address)
        if last_block is None:
            return 1.0

        return last_block.result_vector[0]
        # state = await self.ton_client.get_pool_reserves(Address(pool_address))
        # return state[0] / state[1]

    async def mint(self, amount: float):
        admin_wallet = await self.app_wallet_provider.get_withdraw_wallet()
        amount = AbstractBaseTonClient.to_nano(amount)
        await self.ton_client.mint(
            amount=amount,
            token_address=self.token_minter_address,
            admin_wallet=admin_wallet,
        )

    async def withdraw_to_user(self, amount: float, user_id: UUID):
        user = await self.user_repository.get(user_id)
        app_wallet = await self.app_wallet_provider.get_withdraw_wallet()
        amount = AbstractBaseTonClient.to_nano(amount)
        await self.ton_client.send_jettons(
            amount=amount,
            user_wallet_address=Address(user.wallet_address),
            token_address=self.token_minter_address,
            app_wallet=app_wallet,
        )
        await self.user_repository.fund_user(
            user_id=user.id,
            amount=amount * -1,
        )
        tx_dto = CreateTransactionDTO(
            amount=amount,
            user_id=user_id,
            type=TransactionType.EXTERNAL_WITHDRAWAL,
            recipient=user.wallet_address,
            sender=app_wallet.address,
        )
        await self.transaction_repository.create(
            tx_dto
        )

    async def add_liquidity(self):
        ...

    async def remove_liquidity(self):
        ...
