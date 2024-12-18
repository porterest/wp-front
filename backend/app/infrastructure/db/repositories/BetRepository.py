from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.models.bet import Bet as BetModel
from infrastructure.db.entities import Bet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class BetRepository(
    AbstractSQLAlchemyRepository[Bet, BetModel, CreateBetDTO, UpdateBetDTO]
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
            bet_id=entity.bet_id,
            user_id=entity.user_id,
            pair_id=entity.pair_id,
            amount=entity.amount,
            block_number=entity.block_number,
            vector=entity.vector,
            status=entity.status,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
