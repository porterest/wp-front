from dataclasses import field, dataclass
from typing import Optional

from abstractions.repositories.app_wallet import AppWalletRepositoryInterface
from domain.dto.app_wallet import CreateAppWalletDTO, UpdateAppWalletDTO
from domain.models.app_wallet import AppWallet as AppWalletModel
from infrastructure.db.entities import AppWallet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class AppWalletRepository(
    AbstractSQLAlchemyRepository[AppWallet, AppWalletModel, CreateAppWalletDTO, UpdateAppWalletDTO],
    AppWalletRepositoryInterface
):
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {

        }
    )

    def create_dto_to_entity(self, dto: CreateAppWalletDTO) -> AppWallet:
        return AppWallet(
            address=dto.address,
            wallet_type=dto.wallet_type,
            wallet_version=dto.wallet_version,
            balance=dto.balance,
        )

    def entity_to_model(self, entity: AppWallet) -> AppWalletModel:
        return AppWalletModel(
            id=entity.id,
            address=entity.address,
            wallet_version=entity.wallet_version,
            wallet_type=entity.wallet_type,
            balance=entity.balance,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
