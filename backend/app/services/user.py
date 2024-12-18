from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.user import UserServiceInterface
from domain.metaholder.responses import UserHistoryResponse, TransactionResponse
from domain.models import User
from services.exceptions import NotFoundException, NoSuchUserException


@dataclass
class UserService(UserServiceInterface):
    async def get_user_history(self, user_id: UUID) -> UserHistoryResponse:
        user = await self.get_user(user_id=user_id)
        return UserHistoryResponse(
            user_id=user_id,
            transactions=[
                TransactionResponse(
                    type=t.type,
                    sender=t.sender,
                    recipient=t.
                ) for t in user.transactions
            ]
        )

    user_repository: UserRepositoryInterface

    async def get_user(self, user_id: UUID) -> User:
        try:
            return await self.user_repository.get(obj_id=user_id)
        except NoResultFound:
            raise NotFoundException()

    async def get_user_by_tg_id(self, tg_id: int) -> User:
        pass

    async def get_user_by_wallet(self, wallet_address: str) -> User:
        user = await self.user_repository.get_by_wallet(wallet_address)
        if not user:
            raise NoSuchUserException()
