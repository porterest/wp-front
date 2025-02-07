from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from abstractions.repositories.deposit import DepositRepositoryInterface
from domain.dto.deposit import DepositEntryCreateDTO, DepositEntryUpdateDTO
from domain.models.deposit import DepositEntry as DepositEntryModel
from infrastructure.db.entities import DepositEntry
from infrastructure.db.repositories import AbstractSQLAlchemyRepository


@dataclass
class DepositRepository(
    AbstractSQLAlchemyRepository[DepositEntry, DepositEntryModel, DepositEntryCreateDTO, DepositEntryUpdateDTO],
    DepositRepositoryInterface,
):
    # joined_fields: list[str] = field(default_factory=lambda: ['transaction', 'user', 'app_wallet'])
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'transaction': None,
            'user': None,
            'app_wallet': None,
        }
    )

    def entity_to_model(self, entity: DepositEntry) -> DepositEntryModel:
        return DepositEntryModel(
            id=entity.id,
            status=entity.status,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
            user_id=entity.user_id,
            amount=entity.transaction.amount,
            app_wallet_id=entity.app_wallet_id,
            tx_id=entity.transaction.id,
            # user=UserModel(
            #     id=entity.user.id,
            #     telegram_id=entity.user.telegram_id,
            #     username=entity.user.username,
            #     wallet_address=entity.user.wallet_address,
            #     created_at=entity.user.created_at,
            #     updated_at=entity.user.updated_at,
            # ),
            # app_wallet=AppWalletModel(
            #     id=entity.app_wallet.id,
            #     address=entity.app_wallet.address,
            #     balance=entity.app_wallet.balance,
            #     wallet_type=entity.app_wallet.wallet_type,
            #     created_at=entity.app_wallet.created_at,
            #     updated_at=entity.app_wallet.updated_at,
            # ),
            # transaction=TransactionModel(
            #     id=entity.transaction.id,
            #     type=entity.transaction.type,
            #     amount=entity.transaction.amount,
            #     sender=entity.transaction.sender,
            #     recipient=entity.transaction.recipient,
            #     tx_id=entity.transaction.tx_id,
            #     user=entity.transaction.user,
            #     created_at=entity.transaction.created_at,
            #     updated_at=entity.transaction.updated_at
            # )
        )

    def create_dto_to_entity(self, dto: DepositEntryCreateDTO) -> DepositEntry:
        return DepositEntry(
            id=dto.id,
            app_wallet_id=dto.app_wallet_id,
            user_id=dto.user_id,
            status=dto.status,
            transaction_id=dto.tx_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
