from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from abstractions.services.deposit import DepositServiceInterface
from domain.metaholder.responses.deposit_response import DepositResponse


@dataclass
class DepositService(
    DepositServiceInterface,
):

    async def check_user_transactions(self) -> list[DepositResponse]:
        ...
