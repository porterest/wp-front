from dataclasses import dataclass
from uuid import UUID

from apscheduler.schedulers.base import BaseScheduler

from abstractions.repositories.deposit import DepositRepositoryInterface
from abstractions.repositories.pair import PairRepositoryInterface
from abstractions.repositories.transaction import TransactionRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface, AppWalletServiceInterface
from abstractions.services.deposit import DepositServiceInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.tonclient import TonClientInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.deposit import DepositEntryCreateDTO, DepositEntryUpdateDTO
from domain.dto.transaction import CreateTransactionDTO
from domain.enums import TransactionType
from domain.enums.deposit import DepositEntryStatus
from domain.metaholder.responses.deposit_response import DepositResponse
from domain.ton.transaction import TonTransactionStatus


@dataclass
class DepositService(
    DepositServiceInterface,
):
    deposit_repository: DepositRepositoryInterface
    app_wallet_service: AppWalletServiceInterface
    transaction_repository: TransactionRepositoryInterface
    user_service: UserServiceInterface
    scheduler: BaseScheduler
    ton_client: TonClientInterface
    dex_service: DexServiceInterface
    pair_repository: PairRepositoryInterface

    inner_token_symbol: str

    async def check_user_transactions(self) -> list[DepositResponse]:
        ...

    async def start_deposit_process(self, user_id: UUID) -> None:
        app_wallet_id = await self.app_wallet_service.get_deposit_wallet_id()
        user = await self.user_service.get_user(user_id)
        dto = DepositEntryCreateDTO(
            user_id=user.id,
            app_wallet_id=app_wallet_id,
        )
        await self.deposit_repository.create(dto)
        self.scheduler.add_job(
            self.check_for_incoming_transaction,
            args=(dto.id,),
            trigger='interval',
            seconds=30,
            id=f'deposit-{user.wallet_address}',
            max_instances=1,
        )

    async def check_for_incoming_transaction(self, deposit_id: UUID) -> None:
        deposit = await self.deposit_repository.get(deposit_id)

        transactions = await self.ton_client.get_transactions(deposit.app_wallet.address)
        for transaction in transactions:
            if transaction.from_address == deposit.user.wallet_address:
                if transaction.status == TonTransactionStatus.PENDING:
                    # create Transaction entity
                    dto = CreateTransactionDTO(
                        user_id=deposit.user.id,
                        type=TransactionType.EXTERNAL_DEPOSIT,
                        amount=transaction.amount,
                        sender=transaction.from_address,
                        recipient=transaction.to_address,
                        tx_id=transaction.tx_id,
                    )

                    await self.transaction_repository.create(dto)

                    # update Deposit entity with actual tx data
                    dto = DepositEntryUpdateDTO(
                        status=DepositEntryStatus.FUNDED,
                        amount=transaction.amount,
                        tx_id=transaction.tx_id,
                    )

                    await self.deposit_repository.update(deposit_id, dto)

                    pair = await self.pair_repository.get_pair_by_tokens(
                        token1=self.inner_token_symbol,
                        token2=transaction.token,
                    )

                    # performing a swap from TON/USDT/etc. for inner token
                    await self.dex_service.perform_swap(
                        amount=transaction.amount,
                        target_token=f"not {self.inner_token_symbol}",  # todo: mock
                        app_wallet_id=await self.app_wallet_service.get_deposit_wallet_id(),
                        pool_address=pair.contract_address,
                    )

                    # funding a user after successful swap
                    await self.user_service.deposit_funded(deposit_id)
