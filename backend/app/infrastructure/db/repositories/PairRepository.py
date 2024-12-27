from dataclasses import field, dataclass
from typing import Optional

from sqlalchemy import select

from abstractions.repositories.pair import PairRepositoryInterface
from domain.dto.pair import CreatePairDTO, UpdatePairDTO
from domain.models.pair import Pair as PairModel
from infrastructure.db.entities import Pair
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository

@dataclass
class PairRepository(
    AbstractSQLAlchemyRepository[Pair, PairModel, CreatePairDTO, UpdatePairDTO],
    PairRepositoryInterface,
):
    # joined_fields: list[str] = field(default_factory=lambda: ['bets'])
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'bets': None,
        }
    )
    def create_dto_to_entity(self, dto: CreatePairDTO) -> Pair:
        return Pair(
            id=dto.id,
            name=dto.name,
            contract_address=dto.contract_address,
            last_ratio=dto.last_ratio,
        )

    def entity_to_model(self, entity: Pair) -> PairModel:
        return PairModel(
            id=entity.id,
            name=entity.name,
            last_ratio=entity.last_ratio,
            contract_address=entity.contract_address,
            last_ratio=entity.last_ratio,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
