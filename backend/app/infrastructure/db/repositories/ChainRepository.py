from domain.dto.chain import CreateChainDTO, UpdateChainDTO
from domain.models.chain import Chain as ChainModel
from infrastructure.db.entities import Chain
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository

class ChainRepository(
    AbstractSQLAlchemyRepository[Chain, ChainModel, CreateChainDTO, UpdateChainDTO],
):
    def create_dto_to_entity(self, dto: CreateChainDTO) -> Chain:
        return Chain(
            id=dto.id,
            current_block=dto.current_block,
            last_update=dto.last_update,
            created_at=dto.created_at,
            status=dto.status
        )

    def entity_to_model(self, entity: Chain) -> ChainModel:
        return ChainModel(
            id=entity.id,
            current_block=entity.current_block,
            last_update=entity.last_update,
            created_at=entity.created_at,
            status=entity.status
        )
