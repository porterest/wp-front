from abc import ABC, abstractmethod

from domain.metaholder.responses.deposit_response import DepositResponse


class DepositServiceInterface(ABC):

    @abstractmethod
    async def check_users_transactions(self) -> list[DepositResponse]:
        ...
