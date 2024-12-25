from sqlalchemy import select

from abstractions.repositories.user import UserRepositoryInterface
from domain.dto.user import CreateUserDTO, UpdateUserDTO
from domain.models import Balance
from domain.models.user import User as UserModel
from infrastructure.db.entities import User, Transaction, Bet
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class UserRepository(
    AbstractSQLAlchemyRepository[User, UserModel, CreateUserDTO, UpdateUserDTO],
    UserRepositoryInterface,
):
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
            balances=[Balance(balance=b.balance, token_type=b.token_type) for b in entity.balances],
            bets=[Bet(...) for b in entity.bets],  # Подставить соответствующую логику get_user_bets()?
            transactions=[Transaction(...) for t in entity.transactions],  # То же самое
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