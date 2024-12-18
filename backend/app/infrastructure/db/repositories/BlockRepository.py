from domain.dto.block import CreateBlockDTO, UpdateBlockDTO
from domain.models.block import Block as BlockModel
from infrastructure.db.entities import Block
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class BlockRepository(
    AbstractSQLAlchemyRepository[Block, BlockModel, CreateBlockDTO, UpdateBlockDTO],

):
    def create_dto_to_entity(self, dto: CreateBlockDTO) -> Block:
        return Block(
            block_number=dto.block_number,
            status=dto.status,
            result_vector=dto.result_vector,
            created_at=dto.created_at,
            completed_at=dto.completed_at,
        )

    def entity_to_model(self, entity: Block) -> BlockModel:
        return BlockModel(
            block_id=entity.id,
            block_number=entity.block_number,
            status=entity.status,
            result_vector=entity.result_vector,
            created_at=entity.created_at,
            completed_at=entity.completed_at,
        )
