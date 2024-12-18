from domain.dto.pair import CreatePairDTO, UpdatePairDTO
from domain.models.pair import Pair as PairModel
from infrastructure.db.entities import Pair
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class PairRepository(
    AbstractSQLAlchemyRepository[Pair, PairModel, CreatePairDTO, UpdatePairDTO]
):
    def create_dto_to_entity(self, dto: CreatePairDTO) -> Pair:
        return Pair(
            name=dto.name,
            contract_address=dto.contract_address
        )

    def entity_to_model(self, entity: Pair) -> PairModel:
        return PairModel(
            pair_id=entity.pair_id,
            name=entity.name,
            contract_address=entity.contract_address,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
