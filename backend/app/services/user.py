import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.exc import NoResultFound

from abstractions.repositories.deposit import DepositRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.currency import CurrencyServiceInterface
from abstractions.services.swap import SwapServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.user import UpdateUserDTO, CreateUserDTO
from domain.enums.deposit import DepositEntryStatus
from domain.metaholder.enums import BetStatus as MetaholderBetStatus
from domain.metaholder.responses import TransactionResponse, BetResponse
from domain.metaholder.responses.user import UserBetsResponse, UserHistoryResponse
from domain.models import User
from domain.models.reward_model import Rewards
from domain.models.user import BettingActivity
from services.exceptions import NotFoundException, NoSuchUserException

logger = logging.getLogger(__name__)


@dataclass
class UserService(UserServiceInterface):
    user_repository: UserRepositoryInterface
    block_service: BlockServiceInterface
    swap_service: SwapServiceInterface
    deposit_repository: DepositRepositoryInterface
    currency_service: CurrencyServiceInterface

    async def distribute_rewards(self, rewards: Rewards) -> None:
        for reward in rewards.user_rewards:
            await self.user_repository.fund_user(user_id=reward.user_id, amount=reward.reward)

    async def ensure_user(self, wallet_address: str) -> None:
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
                    id=bet.id,
                    amount=bet.amount,
                    vector=bet.vector,
                    status=MetaholderBetStatus(bet.status.value),
                    pair_name=bet.pair.name,
                    created_at=bet.created_at,
                ) for bet in user.bets
            ]
        )

    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID) -> Optional[BetResponse]:
        last_block = await self.block_service.get_last_completed_block_by_pair_id(pair_id=pair_id)
        for bet in last_block.bets:
            if bet.user_id == user_id:
                return BetResponse(
                    id=bet.id,
                    amount=bet.amount,
                    vector=bet.vector,
                    status=MetaholderBetStatus(bet.status.value),
                    pair_name=bet.pair.name,
                    created_at=bet.created_at,
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

    async def get_users_activity(
            self,
            block_id: UUID,
    ) -> BettingActivity:
        block = await self.block_service.get_block(block_id)
        return BettingActivity(
            count=len(block.bets),
            volume=sum(map(lambda bet: bet.amount, block.bets)),
        )

    async def deposit_funded(self, deposit_id: UUID) -> None:
        deposit = await self.deposit_repository.get(deposit_id)
        if deposit.status == DepositEntryStatus.FUNDED:
            convert = await self.currency_service.convert_ton_to_inner_token(deposit.amount)
            logger.info("convert")
            logger.info(convert)
            await self.user_repository.fund_user(deposit.user_id, convert)
