from dataclasses import dataclass
from typing import NoReturn
from uuid import UUID

from abstractions.repositories.deposit import DepositRepositoryInterface
from abstractions.services.deposit import DepositServiceInterface
from domain.metaholder.responses.deposit_response import DepositResponse


@dataclass
class DepositService(
    DepositServiceInterface,
):
    deposit_repository: DepositRepositoryInterface

    async def check_user_transactions(self) -> list[DepositResponse]:
        ...

    async def start_deposit_process(self, user_id: UUID) -> NoReturn:
        ...
