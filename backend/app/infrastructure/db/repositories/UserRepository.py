from sqlalchemy import select

from abstractions.repositories.user import UserRepositoryInterface
from domain.dto.user import CreateUserDTO, UpdateUserDTO
from domain.models.user import User as UserModel
from infrastructure.db.entities import User
from infrastructure.db.repositories.AbstractRepository import AbstractSQLAlchemyRepository


class UserRepository(
    AbstractSQLAlchemyRepository[User, UserModel, CreateUserDTO, UpdateUserDTO],
    UserRepositoryInterface,
):
    def create_dto_to_entity(self, dto: CreateUserDTO) -> User:
        return User(
            user_id=dto.user_id,
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