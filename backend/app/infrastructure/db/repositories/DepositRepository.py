from dataclasses import dataclass

from abstractions.repositories.deposit import DepositRepositoryInterface
from domain.dto.deposit import DepositEntryCreateDTO, DepositEntryUpdateDTO
from domain.models.deposit import DepositEntry as DepositEntryModel
from domain.models.user import User as UserModel
from domain.models.app_wallet import AppWallet as AppWalletModel
from domain.models.transaction import Transaction as TransactionModel
from infrastructure.db.entities import DepositEntry
from infrastructure.db.repositories import AbstractSQLAlchemyRepository


@dataclass
class DepositRepository(
    AbstractSQLAlchemyRepository[DepositEntry, DepositEntryModel, DepositEntryCreateDTO, DepositEntryUpdateDTO],
    DepositRepositoryInterface,
):
    def entity_to_model(self, entity: DepositEntry) -> DepositEntryModel:
        return DepositEntryModel(
            id=entity.id,
            status=entity.status,
            user=UserModel(
                id=entity.user.id,
                telegram_id=entity.user.telegram_id,
                username=entity.user.username,
                wallet_address=entity.user.wallet_address,
                created_at=entity.user.created_at,
                updated_at=entity.user.updated_at,
            ),
            app_wallet=AppWalletModel(
                id=entity.app_wallet.id,
                address=entity.app_wallet.address,
                balance=entity.app_wallet.balance,
                wallet_type=entity.app_wallet.wallet_type,
                created_at=entity.app_wallet.created_at,
                updated_at=entity.app_wallet.updated_at,
            ),
            transaction=TransactionModel(
                id=entity.transaction.id,

            )
        )

    def create_dto_to_entity(self, dto: DepositEntryCreateDTO) -> DepositEntry:
        pass
