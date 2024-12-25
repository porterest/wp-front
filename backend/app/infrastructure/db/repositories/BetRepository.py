from abstractions.repositories.bet import BetRepositoryInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.models.bet import Bet as BetModel
from infrastructure.db.entities import Bet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository



class BetRepository(
    AbstractSQLAlchemyRepository[Bet, BetModel, CreateBetDTO, UpdateBetDTO],
    BetRepositoryInterface
):

    def create_dto_to_entity(self, dto: CreateBetDTO) -> Bet:
        return Bet(
            user_id=dto.user_id,
            pair_id=dto.pair_id,
            amount=dto.amount,
            block_number=dto.block_number,
            vector=dto.vector,
            status=dto.status
        )

    def entity_to_model(self, entity: Bet) -> BetModel:
        return BetModel(
            id=entity.id,
            user=entity.user,
            pair=entity.pair,
            amount=entity.amount,
            block_number=entity.block_number,
            vector=entity.vector,
            status=entity.status,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
