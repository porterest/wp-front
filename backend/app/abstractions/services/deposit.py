from abc import ABC, abstractmethod
from uuid import UUID

from domain.metaholder.responses.deposit_response import DepositResponse


class DepositServiceInterface(ABC):

    @abstractmethod
    async def check_users_transactions(self) -> list[DepositResponse]:
        ...

    # @abstractmethod
    # async def start_deposit_process(self, user_id: UUID) -> None:
    #     ...
    # @abstractmethod
    # async def check_for_incoming_transaction(self, deposit_id: UUID) -> None:
    #     ...
