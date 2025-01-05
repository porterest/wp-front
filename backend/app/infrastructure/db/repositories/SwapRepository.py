from dataclasses import field, dataclass
from typing import Optional

from abstractions.repositories.transaction import TransactionRepositoryInterface
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class SwapRepository(
    AbstractSQLAlchemyRepository[Swap, SwapModel, CreateSwapDTO, UpdateSwapDTO],
    TransactionRepositoryInterface
):
    # joined_fields: list[str] = field(default_factory=lambda: ['user'])
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'user': None,
        }
    )
    def create_dto_to_entity(self, dto: CreateSwapDTO) -> Swap:
        return Swap(
            user_id=dto.user_id,
            type=dto.type,
            amount=dto.amount
        )

    def entity_to_model(self, entity: Swap) -> SwapModel:
        return SwapModel(
            id=entity.id,
            type=entity.type,
            amount=entity.amount,
            tx_id=entity.tx_id,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
            sender=entity.sender,
            recipient=entity.recipient,
        )
