from dataclasses import dataclass
from datetime import datetime
from typing import NoReturn
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.user import UpdateUserDTO, CreateUserDTO
from domain.metaholder.responses import TransactionResponse, BetResponse
from domain.metaholder.responses.user import UserBetsResponse, UserHistoryResponse
from domain.models import User
from services.exceptions import NotFoundException, NoSuchUserException


@dataclass
class UserService(UserServiceInterface):
    user_repository: UserRepositoryInterface

    async def ensure_user(self, wallet_address: str) -> NoReturn:
        user = await self.user_repository.get_by_wallet(wallet_address)
        if not user:
            dto = CreateUserDTO(
                wallet_address=wallet_address,
                last_activity=datetime.now(),
            )

            await self.user_repository.create(dto)

    async def get_user_bets(self, user_id: UUID) -> UserBetsResponse:
        user = await self.get_user(user_id)
        return UserBetsResponse(
            user_id=user.id,
            bets=[
                BetResponse(
                    amount=bet.amount,
                    vector=bet.vector,
                    pair_name=bet.pair.name,
                    created_at=bet.created_at,
                ) for bet in user.bets
            ]
        )

    async def get_user_history(self, user_id: UUID) -> UserHistoryResponse:
        user = await self.get_user(user_id=user_id)
        return UserHistoryResponse(
            user_id=user_id,
            transactions=[
                TransactionResponse(
                    type=t.type,
                    sender=t.sender,
                    recipient=t.recipient,
                    amount=t.amount,
                    tx_id=t.tx_id if t.tx_id else None,
                ) for t in user.transactions
            ]
        )

    async def get_user(self, user_id: UUID) -> User:
        try:
            return await self.user_repository.get(obj_id=user_id)
        except NoResultFound:
            raise NotFoundException(f"User with ID {user_id} not found.")

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
        await self.user_repository.update(user_id, update_dto)
        return user

    async def delete_user(self, user_id: UUID) -> None:
        """
        Удаляет пользователя по его ID.
        """
        user = await self.get_user(user_id=user_id)
        await self.user_repository.delete(user_id)

    async def create_user(self, user: CreateUserDTO) -> None:
        """
        Создаёт нового пользователя.
        """
        await self.user_repository.create(user)
