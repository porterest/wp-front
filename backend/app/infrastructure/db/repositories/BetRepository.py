from dataclasses import field, dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy import desc, select

from abstractions.repositories.bet import BetRepositoryInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.enums import BetStatus
from domain.metaholder.responses import BetResponse
from domain.models.bet import Bet as BetModel
from domain.models.pair import Pair as PairModel
from domain.models.user import User as UserModel
from infrastructure.db.entities import Bet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class BetRepository(
    AbstractSQLAlchemyRepository[Bet, BetModel, CreateBetDTO, UpdateBetDTO],
    BetRepositoryInterface
):
    # related fields needed to be fetched while get
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'block': None,  # value is nested fields of relation needed to be fetched
            'user': None,
            'pair': None}
    )

    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID):
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(
        self.entity.user_id == user_id,
                    self.entity.pair_id == pair_id,
                )
                .order_by(desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options)
            )

            bet = res.unique().scalars().one_or_none()
        return self.entity_to_model(bet) if bet else None

    async def get_last_user_completed_bet(self, user_id: UUID) -> Bet:
        async with self.session_maker() as session:
            res = await session.execute(
                select(self.entity)
                .where(
        self.entity.user_id == user_id,
                    self.entity.status == BetStatus.RESOLVED,
                )
                .order_by(desc(self.entity.created_at, ))
                .limit(1)
                .options(*self.options)
            )

            bet = res.unique().scalars().one_or_none()
        return self.entity_to_model(bet) if bet else None


    def create_dto_to_entity(self, dto: CreateBetDTO) -> Bet:
        return Bet(
            id=dto.id,
            user_id=dto.user_id,
            pair_id=dto.pair_id,
            block_id=dto.block_id,
            amount=dto.amount,
            vector=dto.vector,
            status=dto.status
        )

    def entity_to_model(self, entity: Bet) -> BetModel:
        return BetModel(
            id=entity.id,
            user=UserModel(
                id=entity.user.id,
                telegram_id=entity.user.telegram_id,
                username=entity.user.username,
                wallet_address=entity.user.wallet_address,
                created_at=entity.user.created_at,
                updated_at=entity.user.updated_at,
            ),
            pair=PairModel(
                id=entity.pair.id,
                name=entity.pair.name,
                contract_address=entity.pair.contract_address,
                last_ratio=entity.pair.last_ratio,
                created_at=entity.pair.created_at,
                updated_at=entity.pair.updated_at
            ),
            amount=entity.amount,
            block_number=entity.block.block_number,
            vector=entity.vector,
            status=entity.status,
            reward=entity.reward,
            accuracy=entity.accuracy,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
