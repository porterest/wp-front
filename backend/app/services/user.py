import logging
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from pytoniq_core import Address
from sqlalchemy.exc import NoResultFound

from abstractions.repositories.deposit import DepositRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.currency import CurrencyServiceInterface
from abstractions.services.user import UserServiceInterface
from domain.dto.user import CreateUserDTO
from domain.enums.deposit import DepositEntryStatus
from domain.metaholder.enums import BetStatus as MetaholderBetStatus
from domain.metaholder.responses import TransactionResponse, BetResponse
from domain.metaholder.responses.user import UserBetsResponse, UserHistoryResponse
from domain.models import User
from services.exceptions import NotFoundException, NoSuchUserException

logger = logging.getLogger(__name__)


@dataclass
class UserService(UserServiceInterface):
    user_repository: UserRepositoryInterface
    block_service: BlockServiceInterface
    deposit_repository: DepositRepositoryInterface
    currency_service: CurrencyServiceInterface

    async def ensure_user(self, wallet_address: str) -> None:
        user = await self.user_repository.get_by_wallet(wallet_address)
        if not user:
            address = Address(wallet_address)
            dto = CreateUserDTO(
                wallet_address=address.to_str(is_user_friendly=False),
                last_activity=datetime.now(),
            )

            await self.user_repository.create(dto)

    async def get_user_bets(self, user_id: UUID) -> UserBetsResponse:
        user = await self.user_repository.get(user_id)
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
                ) for bet in sorted(user.bets, key=lambda b: b.created_at, reverse=True)
            ]
        )

    async def get_user_history(self, user_id: UUID) -> UserHistoryResponse:
        user = await self.user_repository.get(user_id)
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

    async def deposit_funded(self, deposit_id: UUID) -> None:
        deposit = await self.deposit_repository.get(deposit_id)
        if deposit.status == DepositEntryStatus.FUNDED:
            convert = await self.currency_service.convert_ton_to_inner_token(deposit.amount)
            logger.info("convert")
            logger.info(convert)
            await self.user_repository.fund_user(deposit.user_id, convert)
