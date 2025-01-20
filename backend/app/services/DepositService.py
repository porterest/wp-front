import logging
from dataclasses import dataclass
from datetime import datetime
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
from settings import settings

logger = logging.getLogger(__name__)

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

    async def check_users_transactions(self) -> None:
        logger.info("check_users_transactions")
        wallet = await self.app_wallet_service.get_deposit_wallet()
        logger.info("wallet")
        logger.info(wallet)
        transactions = await self.ton_client.get_transactions(wallet.address)
        logger.info("transactions")
        logger.info(transactions)
        if transactions:
            for transaction in transactions:
                user = await self.user_service.get_user_by_wallet(transaction.from_address)
                if user:
                    deposit = DepositEntryCreateDTO(
                        app_wallet_id=wallet.id,
                        user_id=user.id,
                        status=DepositEntryStatus.FUNDED,
                        amount=transaction.amount,
                        tx_id=transaction.tx_id
                    )
                    logger.info("deposit")
                    logger.info(deposit)
                    await self.deposit_repository.create(deposit)
                    await self.user_service.deposit_funded(deposit.id)

                    dto = CreateTransactionDTO(
                        user_id=user.id,
                        type=TransactionType.EXTERNAL_DEPOSIT,
                        amount=transaction.amount,
                        sender=transaction.from_address,
                        recipient=transaction.to_address,
                        tx_id=transaction.tx_id,
                    )
                    logger.info("Transaction")
                    logger.info(dto)

                    await self.transaction_repository.create(dto)

