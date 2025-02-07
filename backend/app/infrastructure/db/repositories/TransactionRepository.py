from dataclasses import field, dataclass
from typing import Optional

from abstractions.repositories.transaction import TransactionRepositoryInterface
from domain.dto.transaction import CreateTransactionDTO, UpdateTransactionDTO
from domain.models.transaction import Transaction as TransactionModel
from infrastructure.db.entities import Transaction
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class TransactionRepository(
    AbstractSQLAlchemyRepository[Transaction, TransactionModel, CreateTransactionDTO, UpdateTransactionDTO],
    TransactionRepositoryInterface
):
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'user': None,
        }
    )

    def create_dto_to_entity(self, dto: CreateTransactionDTO) -> Transaction:
        return Transaction(
            id=dto.id,
            user_id=dto.user_id,
            type=dto.type,
            amount=dto.amount,
            tx_id=dto.tx_id,
            recipient=dto.recipient,
            sender=dto.sender,
        )

    def entity_to_model(self, entity: Transaction) -> TransactionModel:
        return TransactionModel(
            id=entity.id,
            type=entity.type,
            amount=entity.amount,
            tx_id=entity.tx_id,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
            sender=entity.sender,
            recipient=entity.recipient,
        )
