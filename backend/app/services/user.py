from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.user import UpdateUserDTO
from domain.metaholder.responses import UserHistoryResponse, TransactionResponse
from domain.models import User
from services.exceptions import NotFoundException, NoSuchUserException


@dataclass
class UserService(UserServiceInterface):
    user_repository: UserRepositoryInterface

    async def get_user_history(self, user_id: UUID) -> UserHistoryResponse:
        user = await self.get_user(user_id=user_id)
        return UserHistoryResponse(
            user_id=user_id,
            transactions=[
                TransactionResponse(
                    type=t.type,
                    sender=t.sender,
                    recipient=t.sender
                ) for t in user.transactions
            ]
        )

    async def get_user(self, user_id: UUID) -> User:
        try:
            return await self.user_repository.get(obj_id=user_id)
        except NoResultFound:
            raise NotFoundException(f"User with ID {user_id} not found.")

    async def get_user_by_tg_id(self, tg_id: int) -> User:
        user = await self.user_repository.get_by_tg_id(tg_id=tg_id)
        if not user:
            raise NoSuchUserException(f"User with Telegram ID {tg_id} not found.")
        return user

    async def get_user_by_wallet(self, wallet_address: str) -> User:
        user = await self.user_repository.get_by_wallet(wallet_address=wallet_address)
        if not user:
            raise NoSuchUserException(f"User with wallet address {wallet_address} not found.")
        return user

    async def update_user(self, user_id: UUID, update_dto: UpdateUserDTO) -> User:
        """
        Обновляет информацию о пользователе на основе переданного DTO.
        """
        user = await self.get_user(user_id=user_id)
        user = self._apply_updates(user, update_dto)
        await self.user_repository.update(user)
        return user

    async def delete_user(self, user_id: UUID) -> None:
        """
        Удаляет пользователя по его ID.
        """
        user = await self.get_user(user_id=user_id)
        await self.user_repository.delete(user)

    async def create_user(self, tg_id: int, wallet_address: str, username: str) -> User:
        """
        Создаёт нового пользователя.
        """
        user = User(tg_id=tg_id, wallet_address=wallet_address, username=username)
        return await self.user_repository.create(user)
