from abc import ABC, abstractmethod
from uuid import UUID

from domain.metaholder.responses.deposit_response import DepositResponse


class DepositServiceInterface(ABC):

    @abstractmethod
    async def check_user_transactions(self) -> list[DepositResponse]:
        ...

    @abstractmethod
    async def start_deposit_process(self, user_id: UUID) -> None:
        ...
