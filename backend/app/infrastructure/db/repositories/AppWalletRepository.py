from domain.dto.app_wallet import CreateAppWalletDTO, UpdateAppWalletDTO
from domain.models.app_wallet import AppWallet as AppWalletModel
from infrastructure.db.entities import AppWallet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class AppWalletRepository(
    AbstractSQLAlchemyRepository[AppWallet, AppWalletModel, CreateAppWalletDTO, UpdateAppWalletDTO]
):
    def create_dto_to_entity(self, dto: CreateAppWalletDTO) -> AppWallet:
        return AppWallet(
            address=dto.address,
            wallet_type=dto.wallet_type,
            balance=dto.balance
        )

    def entity_to_model(self, entity: AppWallet) -> AppWalletModel:
        return AppWalletModel(
            wallet_id=entity.wallet_id,
            address=entity.address,
            wallet_type=entity.wallet_type,
            balance=entity.balance,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
