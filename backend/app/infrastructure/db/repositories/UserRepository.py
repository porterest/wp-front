from dataclasses import field, dataclass
from typing import Optional

from sqlalchemy import select

from abstractions.repositories.user import UserRepositoryInterface
from domain.dto.user import CreateUserDTO, UpdateUserDTO
from domain.models.bet import Bet as BetModel
from domain.models.pair import Pair as PairModel
from domain.models.transaction import Transaction as TransactionModel
from domain.models.user import User as UserModel
from infrastructure.db.entities import User, Bet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


@dataclass
class UserRepository(
    AbstractSQLAlchemyRepository[User, UserModel, CreateUserDTO, UpdateUserDTO],
    UserRepositoryInterface,
):
    joined_fields: dict[str, Optional[list[str]]] = field(
        default_factory=lambda: {
            'bets': ['pair', 'block'],
            'transactions': None,
            'deposits': None,
        }
    )

    def create_dto_to_entity(self, dto: CreateUserDTO) -> User:
        return User(
            username=dto.username,
            first_name=dto.first_name,
            last_name=dto.last_name,
            last_activity=dto.last_activity
        )

    def entity_to_model(self, entity: User) -> UserModel:
        return UserModel(
            id=entity.id,
            telegram_id=entity.telegram_id,
            username=entity.username,
            first_name=entity.first_name,
            last_name=entity.last_name,
            last_activity=entity.last_activity,
            wallet_address=entity.wallet_address,
            balance=entity.balance,
            bets=[BetModel(
                id=b.id,
                pair=PairModel(
                    id=b.pair.id,
                    name=b.pair.name,
                    contract_address=b.pair.contract_address,
                    last_ratio=b.pair.last_ratio,
                    created_at=b.pair.created_at,
                    updated_at=b.pair.updated_at,
                ),
                block_number=b.block.block_number,
                user=None,
                amount=b.amount,
                vector=b.vector,
                status=b.status,
                created_at=b.created_at,
                updated_at=b.updated_at,
            ) for b in entity.bets],  # type: Bet
            transactions=[TransactionModel(
                id=t.id,
                type=t.type,
                amount=t.amount,
                sender=t.sender,
                recipient=t.recipient,
                tx_id=t.tx_id,  # would be presented if type is external
                user=None,
                created_at=t.created_at,
                updated_at=t.updated_at
            ) for t in entity.transactions],
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    async def get_by_wallet(self, wallet_address: str) -> UserModel:
        async with self.session_maker() as session:
            res = await session.execute(
                select(User)
                .where(
                    self.entity.wallet_address == wallet_address,
                )
            )
            return res.scalars().one_or_none()
