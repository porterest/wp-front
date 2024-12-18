from domain.dto.balance import CreateBalanceDTO, UpdateBalanceDTO
from domain.models.balance import Balance as BalanceModel
from infrastructure.db.entities import Balance
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class BalanceRepository(
    AbstractSQLAlchemyRepository[Balance, BalanceModel, CreateBalanceDTO, UpdateBalanceDTO]
):
    def create_dto_to_entity(self, dto: CreateBalanceDTO) -> Balance:
        return Balance(
            user_id=dto.user_id,
            balance=dto.balance,
            token_type=dto.token_type
        )

    def entity_to_model(self, entity: Balance) -> BalanceModel:
        return BalanceModel(
            user_id=entity.user_id,
            balance=entity.balance,
            token_type=entity.token_type,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
