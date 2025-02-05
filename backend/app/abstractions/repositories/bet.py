from abc import ABC, abstractmethod
from uuid import UUID

from abstractions.repositories import CRUDRepositoryInterface
from domain.dto.bet import CreateBetDTO, UpdateBetDTO
from domain.models import Bet


class BetRepositoryInterface(
    CRUDRepositoryInterface[
        Bet, CreateBetDTO, UpdateBetDTO
    ],
    ABC,
):
    @abstractmethod
    async def get_last_user_bet(self, user_id: UUID, pair_id: UUID):
        ...
